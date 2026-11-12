// Mot de passe oublie : meme reponse que le compte existe ou non (pas d'annuaire des adresses), et sans
// attendre l'envoi (le temps de reponse ne trahit rien non plus).
import type { APIRoute } from 'astro';
import { getAccount } from '@core/store.js';
import { mailEnabled } from '@core/mail.js';
import { boot } from '../../../server/boot.ts';
import { localLoginEnabled } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';
import { sendReset } from '../../../server/mailer.ts';
import { normalizeEmail } from '../../../lib/validate.ts';
import { LANG } from '../../../lib/i18n.ts';

export const POST: APIRoute = async ({ request }) => {
  await boot();
  if (!(await localLoginEnabled()) || !mailEnabled()) return json(404, { error: 'indisponible' });
  const b = await readBody(request);
  const email = normalizeEmail(b.email);
  const lang = b.lang === LANG.en ? LANG.en : LANG.fr;
  if (email) {
    getAccount(email).then((a) => (a ? sendReset(lang, a) : null))
      .then((r) => { if (r && !r.ok) console.error('[mot de passe oublie] envoi :', r.error); })
      .catch((e: unknown) => console.error('[mot de passe oublie]', e instanceof Error ? e.message : e));
  }
  return json(200, { ok: true });
};
