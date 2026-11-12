// Catalogue des modules (modules.json) et traduction d'un module en ordres Docker.
// C'est ICI que vivent les regles de securite du superviseur, en fonctions pures et testees :
// - seuls les identifiants du catalogue existent ;
// - volumes NOMMES uniquement (un chemin de l'hote monterait le disque de la machine) ;
// - jamais de mode privilegie, jamais de reseau de l'hote : le module rejoint le reseau de la pile ;
// - tout conteneur cree porte l'etiquette du superviseur, qui refuse de toucher un conteneur sans elle.
import { readFileSync } from "node:fs";

export const MANAGED_LABEL = "isno.managed";
export const MODULE_LABEL = "isno.module";

export type ModuleSpec = {
  title: string;
  image: string;                       // nom:version exacte (jamais « latest »)
  container: string;
  command?: string[];
  volumes?: Record<string, string>;    // volume nomme -> point de montage (suffixe « :ro » : lecture seule)
  ports?: Record<string, string>;      // port du conteneur (« 8883/tcp ») -> port publie sur l'hote
  endpoint?: string;                   // adresse de connexion annoncee a l'app
};
export type Catalog = Record<string, ModuleSpec>;

const NAME_RE = /^[a-z0-9][a-z0-9_.-]{1,62}$/;
const IMAGE_RE = /^[a-z0-9][a-z0-9._/-]*:[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Valide un catalogue ; leve une erreur explicite au premier defaut (le superviseur ne demarre pas). */
export function validateCatalog(raw: unknown): Catalog {
  if (!raw || typeof raw !== "object") throw new Error("catalogue : objet attendu");
  const out: Catalog = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    if (id.startsWith("$")) continue;                      // commentaires
    if (!NAME_RE.test(id)) throw new Error(`catalogue : identifiant invalide « ${id} »`);
    const m = v as Partial<ModuleSpec>;
    if (!m.title || !m.image || !m.container) throw new Error(`catalogue ${id} : title, image et container requis`);
    if (!IMAGE_RE.test(m.image) || m.image.endsWith(":latest")) throw new Error(`catalogue ${id} : image a version exacte requise (${m.image})`);
    if (!NAME_RE.test(m.container)) throw new Error(`catalogue ${id} : nom de conteneur invalide`);
    for (const [vol, target] of Object.entries(m.volumes ?? {})) {
      if (!NAME_RE.test(vol)) throw new Error(`catalogue ${id} : seuls les volumes NOMMES sont permis (« ${vol} » refuse)`);
      if (!/^\/[^:]*(:ro)?$/.test(target)) throw new Error(`catalogue ${id} : point de montage absolu requis (option « :ro » seulement)`);
    }
    for (const cport of Object.keys(m.ports ?? {}))
      if (!/^[0-9]{1,5}\/(tcp|udp)$/.test(cport)) throw new Error(`catalogue ${id} : port de conteneur invalide « ${cport} »`);
    out[id] = { title: m.title, image: m.image, container: m.container, command: m.command, volumes: m.volumes, ports: m.ports, endpoint: m.endpoint };
  }
  return out;
}

export const loadCatalog = (path: string): Catalog => validateCatalog(JSON.parse(readFileSync(path, "utf8")));

/** Substitue ${VAR:-defaut} depuis l'environnement (seulement des variables nommees en MAJUSCULES). */
export function substitute(s: string, env: Record<string, string | undefined>): string {
  return s.replace(/\$\{([A-Z0-9_]+)(?::-([^}]*))?\}/g, (_m, name: string, def?: string) => env[name] ?? def ?? "");
}

/** Ports publies : port du conteneur (catalogue) -> port de l'hote (catalogue, apres substitution). */
export function portBindings(m: ModuleSpec, env: Record<string, string | undefined>): Record<string, { HostPort: string }[]> {
  const out: Record<string, { HostPort: string }[]> = {};
  for (const [cport, host] of Object.entries(m.ports ?? {})) {
    const hp = substitute(host, env);
    const n = Number(hp);
    if (!Number.isInteger(n) || n < 1 || n > 65535) throw new Error(`port publie invalide pour ${cport} : « ${hp} »`);
    out[cport] = [{ HostPort: String(n) }];
  }
  return out;
}

/** Corps de POST /containers/create pour un module. Aucune option dangereuse n'est exprimable ici. */
export function containerCreateBody(id: string, m: ModuleSpec, network: string, env: Record<string, string | undefined>) {
  const ports = portBindings(m, env);
  return {
    Image: m.image,
    Cmd: m.command?.map((c) => substitute(c, env)),
    Labels: { [MANAGED_LABEL]: "true", [MODULE_LABEL]: id },
    ExposedPorts: Object.fromEntries(Object.keys(ports).map((p) => [p, {}])),
    HostConfig: {
      Binds: Object.entries(m.volumes ?? {}).map(([vol, target]) => `${vol}:${target}`),
      PortBindings: ports,
      RestartPolicy: { Name: "unless-stopped" },
      NetworkMode: network,
      Privileged: false,
    },
  };
}

/** Image « nom:version » -> parametres de POST /images/create. */
export function splitImage(image: string): { fromImage: string; tag: string } {
  const i = image.lastIndexOf(":");
  return { fromImage: image.slice(0, i), tag: image.slice(i + 1) };
}
