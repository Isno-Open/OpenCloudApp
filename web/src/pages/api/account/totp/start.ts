// Double authentification, etape 1 : un nouveau secret (pas encore actif), son QR et sa forme ecrite.
import type { APIRoute } from 'astro';
import QRCode from 'qrcode';
import { getAccount, setTotp } from '@core/store.js';
import { newTotpSecret, otpauthUri } from '@core/totp.js';
import { localAccountsSettings, totpAllowed } from '@core/plugins/local-accounts-settings.js';
import { resolveAccountId } from '../../../../server/auth.ts';
import { json } from '../../../../server/http.ts';
import { portalName } from '../../../../lib/portal.ts';

export const POST: APIRoute = async ({ request }) => {
  const id = await resolveAccountId(request);
  if (!id) return json(401, { error: 'unauthorized' });
  if (!totpAllowed(localAccountsSettings())) return json(403, { error: 'désactivée sur ce portail' });
  const a = await getAccount(id);
  if (!a) return json(401, { error: 'unauthorized' });
  if (a.totpEnabled) return json(409, { error: 'déjà activée' });
  const secret = newTotpSecret();
  await setTotp(id, secret, false);
  const svg = await QRCode.toString(otpauthUri(portalName(), id, secret), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  return json(200, { svg, secret });
};
