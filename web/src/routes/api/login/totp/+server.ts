// Deuxieme etape : le code de l'appli d'authentification, pour une connexion « en attente ».
// Un code ne sert qu'une fois (dernier pas memorise) ; un echec compte pour le blocage s'il est active.
import type { RequestHandler } from './$types';
import { getAccount, recordLoginFailure, setTotpLastStep } from '@opencloudapp/core/store.js';
import { makeSession, readPending } from '@opencloudapp/core/session.js';
import { verifyTotp } from '@opencloudapp/core/totp.js';
import { localAccountsSettings } from '@opencloudapp/core/plugins/local-accounts-settings.js';
import { boot } from '#lib/server/boot.ts';
import { readBody } from '#lib/server/http.ts';
import { LANG, ROUTES, type Lang } from '#lib/i18n.ts';
import { LOGIN_ERROR, LOGIN_STEP } from '#lib/login.ts';

export const POST: RequestHandler = async ({ request }) => {
  await boot();
  const b = await readBody(request);
  const lang: Lang = b.lang === LANG.en ? LANG.en : LANG.fr;
  const login = ROUTES.connexion[lang];
  const now = Date.now();
  const id = readPending(request.headers.get('cookie') ?? undefined, now);
  if (!id) return new Response(null, { status: 303, headers: { Location: `${login}?local=1&e=${LOGIN_ERROR.expired}` } });
  const a = await getAccount(id);
  const step = a?.totpSecret ? verifyTotp(a.totpSecret, String(b.code ?? ''), now, a.totpLastStep) : null;
  if (!a || step === null) {
    const cfg = localAccountsSettings();
    if (a && cfg.lockout.enabled && (await recordLoginFailure(a.id, cfg.lockout.maxFailures, cfg.lockout.minutes, now)))
      return new Response(null, { status: 303, headers: { Location: `${login}?local=1&e=${LOGIN_ERROR.locked}`, 'Set-Cookie': 'pending=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax' } });
    return new Response(null, { status: 303, headers: { Location: `${login}?local=1&step=${LOGIN_STEP.totp}&e=${LOGIN_ERROR.totp}` } });
  }
  await setTotpLastStep(a.id, step);
  const headers = new Headers({ Location: ROUTES.appareils[lang] });
  headers.append('Set-Cookie', 'pending=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax');
  headers.append('Set-Cookie', `sid=${encodeURIComponent(makeSession(a.id))}; HttpOnly; Path=/; SameSite=Lax`);
  return new Response(null, { status: 303, headers });
};
