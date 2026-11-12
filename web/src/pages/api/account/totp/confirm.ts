// Double authentification, etape 2 : un premier code juste active le secret.
import type { APIRoute } from 'astro';
import { getAccount, setTotp, setTotpLastStep } from '@core/store.js';
import { verifyTotp } from '@core/totp.js';
import { resolveAccountId } from '../../../../server/auth.ts';
import { readBody, json } from '../../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  const a = await getAccount(id);
  if (!a?.totpSecret || a.totpEnabled) return json(409, { error: 'aucune activation en cours' });
  const step = verifyTotp(a.totpSecret, String((await readBody(request)).code ?? ''), Date.now());
  if (step === null) return json(400, { error: 'code incorrect' });
  await setTotp(id, a.totpSecret, true);
  await setTotpLastStep(id, step);
  return json(200, { ok: true });
};
