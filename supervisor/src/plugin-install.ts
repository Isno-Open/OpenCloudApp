// Installation et retrait des plugins : telechargement de l'image (si absente), puis copie par un conteneur
// jetable. En arriere-plan, comme les modules ; l'app suit l'etat.
import { MANAGED_LABEL, splitImage } from "./catalog.js";
import { docker, DockerError, inspectContainer, streamJson, volumeExists } from "./docker.js";
import { MODULE_STATE, PullProgress, type ModuleState } from "./progress.js";
import { copyContainerBody, PLUGIN_ACTION, PLUGINS_VOLUME, type PluginAction, type PluginCatalog } from "./plugin-catalog.js";

type Job = { state: ModuleState; progress: number; error?: string };
const jobs = new Map<string, Job>();

export type PluginStatus = { id: string; title: string; description: { fr: string; en: string }; busy: boolean; progress: number; error?: string };
export const pluginStatus = (cat: PluginCatalog, id: string): PluginStatus => {
  const p = cat[id]!, j = jobs.get(id);
  return { id, title: p.title, description: p.description, busy: j?.state === MODULE_STATE.installing, progress: j?.progress ?? 0, error: j?.error };
};

export function startPluginJob(cat: PluginCatalog, id: string, action: PluginAction): void {
  if (jobs.get(id)?.state === MODULE_STATE.installing) return;
  const job: Job = { state: MODULE_STATE.installing, progress: 0 };
  jobs.set(id, job);
  run(cat, id, action, job).then(
    () => { jobs.delete(id); },
    (e: unknown) => { job.state = MODULE_STATE.error; job.error = e instanceof Error ? e.message : String(e); console.error(`[supervisor] plugin ${id} :`, job.error); },
  );
}

const imageExists = async (image: string): Promise<boolean> => {
  try { await docker("GET", `/images/${encodeURIComponent(image)}/json`); return true; }
  catch (e) { if (e instanceof DockerError && e.status === 404) return false; throw e; }
};

async function run(cat: PluginCatalog, id: string, action: PluginAction, job: Job): Promise<void> {
  const p = cat[id]!;
  if (!(await volumeExists(PLUGINS_VOLUME))) await docker("POST", "/volumes/create", { Name: PLUGINS_VOLUME, Labels: { [MANAGED_LABEL]: "true" } });
  if (!(await imageExists(p.image))) {
    const { fromImage, tag } = splitImage(p.image);
    const pull = new PullProgress();
    let pullError: string | undefined;
    await streamJson(await docker("POST", `/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(tag)}`), (ev) => {
      if (typeof ev.error === "string") pullError = ev.error;
      pull.feed(ev as never); job.progress = Math.round(pull.percent() * 0.9);
    });
    if (pullError) throw new Error(`telechargement de ${p.image} : ${pullError}`);
  }
  const name = `isno-plugin-${id}-${action}`;
  const old = await inspectContainer(name);
  if (old) {
    if (old.Config.Labels?.[MANAGED_LABEL] !== "true") throw new Error(`un conteneur « ${name} » existe hors du superviseur : refus d'y toucher`);
    await docker("DELETE", `/containers/${encodeURIComponent(name)}?force=true`);
  }
  await docker("POST", `/containers/create?name=${encodeURIComponent(name)}`, copyContainerBody(id, p.image, action));
  try {
    const waiting = docker("POST", `/containers/${encodeURIComponent(name)}/wait?condition=next-exit`);
    await docker("POST", `/containers/${encodeURIComponent(name)}/start`);
    const { StatusCode } = (await (await waiting).json()) as { StatusCode: number };
    if (StatusCode !== 0) throw new Error(`${action === PLUGIN_ACTION.install ? "copie" : "retrait"} du plugin : code ${StatusCode}`);
  } finally {
    await docker("DELETE", `/containers/${encodeURIComponent(name)}?force=true`).catch(() => undefined);
  }
  job.progress = 100;
}
