// Operateur : nomme un compte existant operateur, ou lui retire ce role. Ni soi-meme (on ne se retire
// pas son propre acces), ni le dernier operateur (le portail resterait sans administration).
import type { RequestHandler } from './$types';
import { getAccount, setAccountAdmin, listAccounts } from '@opencloudapp/core/store.js';
import { requireUserAdmin } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  const me = await requireUserAdmin(request);
  if (!me) return json(403, { error: 'forbidden' });
  const b = await readBody(request);
  const id = String(b.id ?? '');
  if (!id || id === me) return json(400, { error: 'changement refusé' });
  // jamais sans operateur : on ne retire pas le dernier
  const target = await getAccount(id);
  if (target?.admin && (await listAccounts()).filter((a) => a.admin).length <= 1) return json(400, { error: 'dernier opérateur : refusé' });
  if (!(await getAccount(id))) return json(404, { error: 'compte inconnu' });
  await setAccountAdmin(id, b.admin === true);
  return json(200, { ok: true });
};
