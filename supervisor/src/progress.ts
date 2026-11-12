// Etat d'un module et progression d'un telechargement d'image (flux JSON de POST /images/create).
export const MODULE_STATE = {
  absent: "absent",         // ni conteneur ni installation en cours
  installing: "installing", // telechargement / creation en cours
  running: "running",
  stopped: "stopped",
  error: "error",
  foreign: "foreign",       // un conteneur du meme nom existe SANS notre etiquette : on n'y touche pas
} as const;
export type ModuleState = (typeof MODULE_STATE)[keyof typeof MODULE_STATE];

/** Agrege les evenements de telechargement par couche ; rend un pourcentage 0..100. */
export class PullProgress {
  private layers = new Map<string, { current: number; total: number; done: boolean }>();
  feed(ev: { id?: string; status?: string; progressDetail?: { current?: number; total?: number } }): void {
    if (!ev.id || !ev.status) return;
    const l = this.layers.get(ev.id) ?? { current: 0, total: 0, done: false };
    if (ev.status === "Downloading" && ev.progressDetail?.total) {
      l.total = ev.progressDetail.total; l.current = ev.progressDetail.current ?? l.current;
    } else if (/^(Download complete|Pull complete|Already exists)$/.test(ev.status)) {
      l.done = true; if (l.total) l.current = l.total;
    } else if (ev.status === "Pulling fs layer" || ev.status === "Waiting") {
      // couche connue, taille encore inconnue
    } else return;
    this.layers.set(ev.id, l);
  }
  percent(): number {
    const ls = [...this.layers.values()];
    if (!ls.length) return 0;
    const total = ls.reduce((s, l) => s + l.total, 0);
    if (total > 0 && ls.every((l) => l.total > 0 || l.done)) {
      const cur = ls.reduce((s, l) => s + (l.done ? l.total : l.current), 0);
      return Math.min(99, Math.floor((cur / total) * 100));     // 100 seulement une fois demarre
    }
    return Math.floor((ls.filter((l) => l.done).length / ls.length) * 99);
  }
}
