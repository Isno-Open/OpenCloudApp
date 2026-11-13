// Operateur : debloque un compte (echecs de connexion remis a zero).
import type { RequestHandler } from './$types';
import { getAccount, resetLoginFailures } from '@opencloudapp/core/store.js';
import { requireAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const id = String((await readBody(request)).id ?? '');
  if (!(await getAccount(id))) return json(404, { error: 'compte inconnu' });
  await resetLoginFailures(id);
  return json(200, { ok: true });
};
