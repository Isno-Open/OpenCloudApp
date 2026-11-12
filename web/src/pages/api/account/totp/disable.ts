// Desactiver sa double authentification : sur code valide, et seulement si la politique ne l'exige pas.
import type { APIRoute } from 'astro';
import { getAccount, setTotp } from '@core/store.js';
import { verifyTotp } from '@core/totp.js';
import { localAccountsSettings, totpRequiredFor } from '@core/plugins/local-accounts-settings.js';
import { resolveAccountId } from '../../../../server/auth.ts';
import { readBody, json } from '../../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  const a = await getAccount(id);
  if (!a?.totpEnabled || !a.totpSecret) return json(409, { error: 'pas activée' });
  if (totpRequiredFor(localAccountsSettings(), a.admin)) return json(409, { error: 'exigée sur ce portail' });
  if (verifyTotp(a.totpSecret, String((await readBody(request)).code ?? ''), Date.now(), a.totpLastStep) === null) return json(400, { error: 'code incorrect' });
  await setTotp(id, null, false);
  return json(200, { ok: true });
};
