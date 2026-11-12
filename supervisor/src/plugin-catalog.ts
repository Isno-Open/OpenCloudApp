// Catalogue des plugins (plugins.json) et regles d'installation, en fonctions pures et testees.
// Installer un plugin = copier son dossier /plugin, pris dans son image, vers le volume des plugins.
// La copie se fait dans un conteneur jetable : sans reseau, jamais privilegie, avec ce seul volume.
import { readFileSync } from "node:fs";
import { MANAGED_LABEL } from "./catalog.js";

export const PLUGIN_LABEL = "isno.plugin";
/** Volume partage avec le portail (nom fixe, declare aussi dans le compose). */
export const PLUGINS_VOLUME = "isno-plugins";

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

export const PLUGIN_ACTION = { install: "install", remove: "remove" } as const;
export type PluginAction = (typeof PLUGIN_ACTION)[keyof typeof PLUGIN_ACTION];

/** Corps de POST /containers/create du conteneur jetable qui copie (ou retire) le plugin. L'identifiant a
 *  ete valide par le catalogue : il ne peut ni sortir du volume ni injecter de commande. */
export function copyContainerBody(id: string, image: string, action: PluginAction) {
  if (!PLUGIN_ID_RE.test(id)) throw new Error(`identifiant de plugin invalide « ${id} »`);
  const script = action === PLUGIN_ACTION.install
    ? `test -f /plugin/index.js || { echo "image sans /plugin/index.js" >&2; exit 3; }; rm -rf /out/${id} && mkdir -p /out/${id} && cp -R /plugin/. /out/${id}/`
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
