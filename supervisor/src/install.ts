// Installation d'un module du catalogue : volumes nommes, telechargement de l'image (progression suivie),
// creation et demarrage du conteneur sur le reseau de la pile. Idempotent : un module deja installe est
// seulement (re)demarre. Un conteneur du meme nom SANS notre etiquette n'est jamais touche.
import { MANAGED_LABEL, MODULE_LABEL, containerCreateBody, splitImage, type Catalog } from "./catalog.js";
import { docker, inspectContainer, streamJson, volumeExists } from "./docker.js";
import { MODULE_STATE, PullProgress, type ModuleState } from "./progress.js";

type Job = { state: ModuleState; progress: number; error?: string };
const jobs = new Map<string, Job>();

// ready / busy : la DECISION transmise a l'app, pour qu'elle n'ait pas a reinterpreter les etats en texte.
export type ModuleStatus = { id: string; title: string; state: ModuleState; ready: boolean; busy: boolean; progress: number; error?: string; endpoint?: string };
const decide = (s: Omit<ModuleStatus, "ready" | "busy">): ModuleStatus =>
  ({ ...s, ready: s.state === MODULE_STATE.running, busy: s.state === MODULE_STATE.installing });

export async function moduleStatus(cat: Catalog, id: string): Promise<ModuleStatus> {
  const m = cat[id]!;
  const base = { id, title: m.title, endpoint: m.endpoint };
  const job = jobs.get(id);
  if (job && (job.state === MODULE_STATE.installing || job.state === MODULE_STATE.error)) return decide({ ...base, ...job });
  const c = await inspectContainer(m.container);
  if (!c) return decide({ ...base, state: MODULE_STATE.absent, progress: 0 });
  if (c.Config.Labels?.[MANAGED_LABEL] !== "true") return decide({ ...base, state: MODULE_STATE.foreign, progress: 0, error: `un conteneur « ${m.container} » existe deja hors du superviseur` });
  return decide({ ...base, state: c.State.Running ? MODULE_STATE.running : MODULE_STATE.stopped, progress: c.State.Running ? 100 : 0 });
}

/** Lance l'installation en arriere-plan ; rend tout de suite. */
export function startInstall(cat: Catalog, id: string, network: string, env: Record<string, string | undefined>): void {
  if (jobs.get(id)?.state === MODULE_STATE.installing) return;
  const job: Job = { state: MODULE_STATE.installing, progress: 0 };
  jobs.set(id, job);
  install(cat, id, network, env, job).then(
    () => { job.state = MODULE_STATE.running; job.progress = 100; jobs.delete(id); },
    (e: unknown) => { job.state = MODULE_STATE.error; job.error = e instanceof Error ? e.message : String(e); console.error(`[supervisor] ${id} :`, job.error); },
  );
}

async function install(cat: Catalog, id: string, network: string, env: Record<string, string | undefined>, job: Job): Promise<void> {
  const m = cat[id]!;
  const existing = await inspectContainer(m.container);
  if (existing) {
    if (existing.Config.Labels?.[MANAGED_LABEL] !== "true") throw new Error(`un conteneur « ${m.container} » existe deja hors du superviseur : refus d'y toucher`);
    if (!existing.State.Running) await docker("POST", `/containers/${encodeURIComponent(m.container)}/start`);
    return;
  }
  // volume deja present (ex. cree par la pile, partage avec le serveur qui y ecrit) : on le garde tel quel
  for (const vol of Object.keys(m.volumes ?? {}))
    if (!(await volumeExists(vol))) await docker("POST", "/volumes/create", { Name: vol, Labels: { [MANAGED_LABEL]: "true", [MODULE_LABEL]: id } });
  const { fromImage, tag } = splitImage(m.image);
  const pull = new PullProgress();
  let pullError: string | undefined;
  await streamJson(await docker("POST", `/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(tag)}`), (ev) => {
    if (typeof ev.error === "string") pullError = ev.error;
    pull.feed(ev as never); job.progress = pull.percent();
  });
  if (pullError) throw new Error(`telechargement de ${m.image} : ${pullError}`);
  await docker("POST", `/containers/create?name=${encodeURIComponent(m.container)}`, containerCreateBody(id, m, network, env));
  await docker("POST", `/containers/${encodeURIComponent(m.container)}/start`);
}

/** Redemarre un module installe (ex. pour qu'il relise un certificat reemis). Jamais un conteneur etranger. */
export async function restartModule(cat: Catalog, id: string): Promise<void> {
  const m = cat[id]!;
  const c = await inspectContainer(m.container);
  if (!c) throw new Error(`module ${id} non installe`);
  if (c.Config.Labels?.[MANAGED_LABEL] !== "true") throw new Error(`un conteneur « ${m.container} » existe hors du superviseur : refus d'y toucher`);
  await docker("POST", `/containers/${encodeURIComponent(m.container)}/restart`);
}
