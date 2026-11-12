// Operateur : supprime un compte et ses appareils. Ni soi-meme, ni le dernier operateur.
import type { APIRoute } from 'astro';
import { removeAccount, getAccount, listAccounts } from '@core/store.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  const me = await requireAdmin(request);
  if (!me) return json(403, { error: 'forbidden' });
  const id = String((await readBody(request)).id ?? '');
  if (!id || id === me) return json(400, { error: 'suppression refusée' });
  // jamais sans operateur : on ne retire pas le dernier
  const target = await getAccount(id);
  if (target?.admin && (await listAccounts()).filter((a) => a.admin).length <= 1) return json(400, { error: 'dernier opérateur : refusé' });
  await removeAccount(id);
  return json(200, { ok: true });
};
