// Operateur : reinitialise la double authentification d'un compte (telephone perdu). Le compte devra la
// reactiver depuis son ecran Compte (exigee par la politique ? il y sera renvoye a la connexion).
import type { RequestHandler } from './$types';
import { getAccount, setTotp } from '@opencloudapp/core/store.js';
import { requireUserAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireUserAdmin(request))) return json(403, { error: 'forbidden' });
  const id = String((await readBody(request)).id ?? '');
  if (!(await getAccount(id))) return json(404, { error: 'compte inconnu' });
  await setTotp(id, null, false);
  return json(200, { ok: true });
};
