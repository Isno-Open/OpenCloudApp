// Operateur : supprime un compte et ses appareils. Ni soi-meme, ni l'operateur seme 'admin'.
import type { APIRoute } from 'astro';
import { removeAccount } from '@core/store.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  const me = await requireAdmin(request);
  if (!me) return json(403, { error: 'forbidden' });
  const id = String((await readBody(request)).id ?? '');
  if (!id || id === me || id === 'admin') return json(400, { error: 'suppression refusée' });
  await removeAccount(id);
  return json(200, { ok: true });
};
