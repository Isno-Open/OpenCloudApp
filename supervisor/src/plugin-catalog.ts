// Catalogue des plugins (plugins.json) et regles d'installation, en fonctions pures et testees.
// Installer un plugin = copier son dossier /plugin, pris dans son image, vers le volume des plugins.
// La copie se fait dans un conteneur jetable : sans reseau, jamais privilegie, avec ce seul volume.
import { existsSync, readFileSync } from "node:fs";
import { MANAGED_LABEL } from "./catalog.js";

export const PLUGIN_LABEL = "isno.plugin";
/** Volume partage avec le portail (nom fixe, declare aussi dans le compose). */
export const PLUGINS_VOLUME = "isno-plugins";
/** Etiquette laissee par l'installation dans le dossier du plugin : l'image (version comprise) copiee.
 *  C'est elle qu'on compare au catalogue pour savoir si une mise a jour existe. */
export const INSTALLED_IMAGE_FILE = ".image";

export type LocalizedText = { fr: string; en: string };
export type PluginSpec = { title: string; description: LocalizedText; image: string };
export type PluginCatalog = Record<string, PluginSpec>;

// identifiant = nom de dossier dans le volume : lettres minuscules, chiffres, tirets (jamais « .. » ni « / »)
export const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
const IMAGE_RE = /^[a-z0-9][a-z0-9._/-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function validatePluginCatalog(raw: unknown): PluginCatalog {
  if (!raw || typeof raw !== "object") throw new Error("catalogue des plugins : objet attendu");
  const out: PluginCatalog = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (id.startsWith("$")) continue;
    if (!PLUGIN_ID_RE.test(id)) throw new Error(`plugin : identifiant invalide « ${id} »`);
    const p = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
    const d = (p.description && typeof p.description === "object" ? p.description : {}) as Record<string, unknown>;
    if (typeof p.title !== "string" || !p.title) throw new Error(`plugin ${id} : title requis`);
    if (typeof d.fr !== "string" || typeof d.en !== "string") throw new Error(`plugin ${id} : description fr et en requises`);
    if (typeof p.image !== "string" || !IMAGE_RE.test(p.image) || p.image.endsWith(":latest")) throw new Error(`plugin ${id} : image a version exacte requise`);
    out[id] = { title: p.title, description: { fr: d.fr, en: d.en }, image: p.image };
  }
  return out;
}
export const loadPluginCatalog = (path: string): PluginCatalog => validatePluginCatalog(JSON.parse(readFileSync(path, "utf8")));

/** Source du catalogue ISNO, livre avec cette version (toujours prioritaire). */
export const ISNO_SOURCE = "isno";
/** Source du catalogue propre a CETTE instance (fichier pose par son administrateur, ex. plugin prive). */
export const LOCAL_SOURCE = "local";
/** Adresse d'une source ajoutee : https seulement (le contenu decide du code qui tournera dans le portail). */
export const isSourceUrl = (u: string): boolean => { try { return new URL(u).protocol === "https:" && u.length <= 500; } catch { return false; } };

/** Catalogue local de l'instance, RELU a chaque appel : l'administrateur change une version dans le
 *  fichier, la page Plugins la voit sans redemarrer le superviseur. Fichier absent ou illisible : une
 *  erreur de source, jamais un arret du superviseur. Chemin vide : pas de catalogue local. */
export function readLocalCatalog(path: string): { raws: { source: string; raw: unknown }[]; errors: SourceError[] } {
  if (!path) return { raws: [], errors: [] };
  try { return { raws: [{ source: LOCAL_SOURCE, raw: JSON.parse(readFileSync(path, "utf8")) }], errors: [] }; }
  catch (e) { return { raws: [], errors: [{ source: LOCAL_SOURCE, error: e instanceof Error ? e.message : String(e), unreadable: true }] }; }
}

/** unreadable : la source entiere est inutilisable (illisible, invalide) ; sinon une seule entree est ignoree. */
export type SourceError = { source: string; error: string; unreadable: boolean };
export type MergedCatalog = { plugins: PluginCatalog; sourceOf: Record<string, string>; errors: SourceError[] };
/** Fusionne le catalogue ISNO et les sources ajoutees. Un identifiant deja pris n'est jamais remplace :
 *  une source ajoutee ne peut pas se substituer a un plugin ISNO (ni a un plugin d'une source anterieure). */
export function mergeCatalogs(isno: PluginCatalog, extra: readonly { source: string; raw: unknown }[]): MergedCatalog {
  const plugins: PluginCatalog = { ...isno };
  const sourceOf: Record<string, string> = Object.fromEntries(Object.keys(isno).map((id) => [id, ISNO_SOURCE]));
  const errors: SourceError[] = [];
  for (const { source, raw } of extra) {
    let cat: PluginCatalog;
    try { cat = validatePluginCatalog(raw); } catch (e) { errors.push({ source, error: e instanceof Error ? e.message : String(e), unreadable: true }); continue; }
    for (const [id, spec] of Object.entries(cat)) {
      if (plugins[id]) { errors.push({ source, error: `« ${id} » existe deja (${sourceOf[id]}) : ignore`, unreadable: false }); continue; }
      plugins[id] = spec; sourceOf[id] = source;
    }
  }
  return { plugins, sourceOf, errors };
}

export const PLUGIN_ACTION = { install: "install", remove: "remove" } as const;
export type PluginAction = (typeof PLUGIN_ACTION)[keyof typeof PLUGIN_ACTION];

/** Corps de POST /containers/create du conteneur jetable qui copie (ou retire) le plugin. L'identifiant a
 *  ete valide par le catalogue : il ne peut ni sortir du volume ni injecter de commande. */
export function copyContainerBody(id: string, image: string, action: PluginAction) {
  if (!PLUGIN_ID_RE.test(id)) throw new Error(`identifiant de plugin invalide « ${id} »`);
  // L'image entre dans le script (etiquette) : seul le format valide par le catalogue y passe.
  if (!IMAGE_RE.test(image)) throw new Error(`image de plugin invalide « ${image} »`);
  const script = action === PLUGIN_ACTION.install
    ? `test -f /plugin/index.js || { echo "image sans /plugin/index.js" >&2; exit 3; }; rm -rf /out/${id} && mkdir -p /out/${id} && cp -R /plugin/. /out/${id}/ && printf '%s' '${image}' > /out/${id}/${INSTALLED_IMAGE_FILE}`
    : `rm -rf /out/${id}`;
  return {
    Image: image,
    Entrypoint: ["/bin/sh", "-c"],
    Cmd: [script],
    User: "0",
    Labels: { [MANAGED_LABEL]: "true", [PLUGIN_LABEL]: id },
    HostConfig: { Binds: [`${PLUGINS_VOLUME}:/out`], NetworkMode: "none", Privileged: false, RestartPolicy: { Name: "no" } },
  };
}

/** Version lisible d'une image : son etiquette (« 0.2.0 » pour « nom:0.2.0 »). */
export const imageVersion = (image: string): string => image.slice(image.lastIndexOf(":") + 1);

export type UpdateInfo = { version: string; installedVersion: string | null; updateAvailable: boolean };
/** DECISION de mise a jour, prise ici et rendue telle quelle a la page : un plugin present dont l'image
 *  installee n'est pas celle du catalogue a une mise a jour. Present sans etiquette (installe avant
 *  qu'elle existe) : version inconnue, donc mise a jour proposee, ce qui pose l'etiquette. */
export function updateInfo(catalogImage: string, installed: { present: boolean; image: string | null }): UpdateInfo {
  return {
    version: imageVersion(catalogImage),
    installedVersion: installed.image ? imageVersion(installed.image) : null,
    updateAvailable: installed.present && installed.image !== catalogImage,
  };
}

/** Ce qui est installe pour `id` dans le dossier des plugins monte en lecture (`dir`). */
export function readInstalled(dir: string, id: string): { present: boolean; image: string | null } {
  const base = `${dir}/${id}`;
  if (!PLUGIN_ID_RE.test(id) || !existsSync(`${base}/index.js`)) return { present: false, image: null };
  try { return { present: true, image: readFileSync(`${base}/${INSTALLED_IMAGE_FILE}`, "utf8").trim() || null }; }
  catch { return { present: true, image: null }; }
}
