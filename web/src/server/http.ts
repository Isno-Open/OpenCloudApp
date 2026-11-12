// Petits utilitaires pour les routes /api (lecture du corps JSON ou formulaire, reponse JSON).
export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const ct = request.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) { try { return await request.json() as Record<string, unknown>; } catch { return {}; } }
  const f = await request.formData().catch(() => null);
  if (!f) return {};
  const o: Record<string, unknown> = {};
  for (const [k, v] of f.entries()) o[k] = typeof v === 'string' ? v : '';
  return o;
}
export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
