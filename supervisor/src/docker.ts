// Client minimal de l'API Docker, via le filtre socket-proxy (jamais le socket directement).
const BASE = (process.env.DOCKER_HOST ?? "http://socket-proxy:2375").replace(/^tcp:/, "http:").replace(/\/$/, "");

export class DockerError extends Error { constructor(public status: number, msg: string) { super(msg); } }

export async function docker(method: string, path: string, body?: unknown): Promise<Response> {
  const r = await fetch(BASE + path, {
    method, headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status >= 400) throw new DockerError(r.status, `${method} ${path} -> ${r.status} ${await r.text()}`);
  return r;
}

/** Inspecte un conteneur ; null s'il n'existe pas. */
export async function inspectContainer(name: string): Promise<{ State: { Running: boolean }; Config: { Labels: Record<string, string> | null } } | null> {
  try { return (await (await docker("GET", `/containers/${encodeURIComponent(name)}/json`)).json()) as never; }
  catch (e) { if (e instanceof DockerError && e.status === 404) return null; throw e; }
}

/** Lit un flux JSON ligne a ligne (telechargement d'image) et appelle onEvent pour chaque objet. */
export async function streamJson(r: Response, onEvent: (ev: Record<string, unknown>) => void): Promise<void> {
  const reader = r.body?.getReader(); if (!reader) return;
  const dec = new TextDecoder(); let buf = "";
  for (;;) {
    const { value, done } = await reader.read(); if (done) break;
    buf += dec.decode(value, { stream: true });
    let i; while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (line) { try { onEvent(JSON.parse(line) as Record<string, unknown>); } catch { /* ligne partielle */ } }
    }
  }
}
