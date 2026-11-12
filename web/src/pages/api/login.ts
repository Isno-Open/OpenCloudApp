// Connexion locale (greffon « Comptes locaux »). Ordre : captcha (si active) -> blocage en cours ->
// mot de passe (echec compte si le blocage est active) -> double authentification (si activee sur le
// compte : jeton « en attente », puis code) -> session.
import type { APIRoute } from 'astro';
import { getAccount, recordLoginFailure, resetLoginFailures } from '@core/store.js';
import { verifyPass } from '@core/auth.js';
import { makeSession, makePending, signingKey, PENDING_TTL_MS } from '@core/session.js';
import { verifyCaptcha } from '@core/captcha.js';
import { localAccountsSettings, totpAllowed } from '@core/plugins/local-accounts-settings.js';
import { boot } from '../../server/boot.ts';
import { localLoginEnabled } from '../../server/auth.ts';
import { readBody } from '../../server/http.ts';
import { LANG, ROUTES, type Lang } from '../../lib/i18n.ts';
import { LOGIN_ERROR, LOGIN_STEP, type LoginError } from '../../lib/login.ts';

const back = (lang: Lang, e: LoginError) => new Response(null, { status: 303, headers: { Location: `${ROUTES.connexion[lang]}?local=1&e=${e}` } });

export const POST: APIRoute = async ({ request }) => {
  await boot();
  if (!(await localLoginEnabled())) return new Response(null, { status: 404 });
  const b = await readBody(request);
  const lang: Lang = b.lang === LANG.en ? LANG.en : LANG.fr;
  const cfg = localAccountsSettings();
  const now = Date.now();
  if (cfg.captcha && !verifyCaptcha(String(b.captcha_token ?? ''), String(b.captcha ?? ''), signingKey(), now)) return back(lang, LOGIN_ERROR.captcha);
  const id = String(b.user ?? '').trim().toLowerCase();   // identifiant = e-mail
  const a = await getAccount(id);
  if (a?.lockedUntil && a.lockedUntil > now) return back(lang, LOGIN_ERROR.locked);
  if (!a || !a.passHash || !verifyPass(String(b.pass ?? ''), a.passHash)) {
    if (a && cfg.lockout.enabled && (await recordLoginFailure(a.id, cfg.lockout.maxFailures, cfg.lockout.minutes, now))) return back(lang, LOGIN_ERROR.locked);
    return back(lang, LOGIN_ERROR.bad);
  }
  await resetLoginFailures(a.id);
  if (a.totpEnabled && a.totpSecret && totpAllowed(cfg)) {
    return new Response(null, { status: 303, headers: {
      Location: `${ROUTES.connexion[lang]}?local=1&step=${LOGIN_STEP.totp}`,
      'Set-Cookie': `pending=${encodeURIComponent(makePending(a.id, now))}; HttpOnly; Path=/; Max-Age=${PENDING_TTL_MS / 1000}; SameSite=Lax`,
    } });
  }
  return new Response(null, { status: 303, headers: {
    Location: ROUTES.appareils[lang],
    'Set-Cookie': `sid=${encodeURIComponent(makeSession(a.id))}; HttpOnly; Path=/; SameSite=Lax`,
  } });
};
