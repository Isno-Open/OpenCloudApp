// Operateur : debloque un compte (echecs de connexion remis a zero).
import type { APIRoute } from 'astro';
import { getAccount, resetLoginFailures } from '@core/store.js';
import { requireUserAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireUserAdmin(request))) return json(403, { error: 'forbidden' });
  const id = String((await readBody(request)).id ?? '');
  if (!(await getAccount(id))) return json(404, { error: 'compte inconnu' });
  await resetLoginFailures(id);
  return json(200, { ok: true });
};
