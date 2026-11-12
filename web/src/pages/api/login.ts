import type { APIRoute } from 'astro';
import { getAccount } from '@core/store.js';
import { verifyPass } from '@core/auth.js';
import { makeSession } from '@core/session.js';
import { boot } from '../../server/boot.ts';
import { readBody } from '../../server/http.ts';
import { LANG, ROUTES, type Lang } from '../../lib/i18n.ts';

export const POST: APIRoute = async ({ request }) => {
  await boot();
  const b = await readBody(request);
  const lang: Lang = b.lang === LANG.en ? LANG.en : LANG.fr;
  const a = await getAccount(String(b.user ?? ''));
  if (!a || !a.passHash || !verifyPass(String(b.pass ?? ''), a.passHash)) {
    return new Response(null, { status: 303, headers: { Location: `${ROUTES.connexion[lang]}?e=1` } });
  }
  return new Response(null, {
    status: 303,
    headers: {
      Location: ROUTES.volets[lang],
      'Set-Cookie': `sid=${encodeURIComponent(makeSession(a.id))}; HttpOnly; Path=/; SameSite=Lax`,
    },
  });
};
