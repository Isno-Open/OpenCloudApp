import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { b as recordLoginFailure, m as getAccount, t as boot, w as resetLoginFailures } from "./boot_CuD6Xa_G.mjs";
import { d as verifyPass } from "./config_2VUiG471.mjs";
import { n as makePending, o as signingKey, r as makeSession, t as PENDING_TTL_MS } from "./session_1DdEKdyP.mjs";
import { r as verifyCaptcha } from "./captcha_O9QDSjEd.mjs";
import { i as totpAllowed, r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { n as localLoginEnabled } from "./auth_Da2rUxTp.mjs";
import { n as readBody } from "./http_GIg9YBvo.mjs";
import { n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { r as LOGIN_STEP, t as LOGIN_ERROR } from "./login_CzMTT3CN.mjs";
// src/pages/api/login.ts
var login_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var back = (lang, e) => new Response(null, {
	status: 303,
	headers: { Location: `${ROUTES.connexion[lang]}?local=1&e=${e}` }
});
var POST = async ({ request }) => {
	await boot();
	if (!await localLoginEnabled()) return new Response(null, { status: 404 });
	const b = await readBody(request);
	const lang = b.lang === LANG.en ? LANG.en : LANG.fr;
	const cfg = localAccountsSettings();
	const now = Date.now();
	if (cfg.captcha && !verifyCaptcha(String(b.captcha_token ?? ""), String(b.captcha ?? ""), signingKey(), now)) return back(lang, LOGIN_ERROR.captcha);
	const id = String(b.user ?? "").trim().toLowerCase();
	const a = await getAccount(id);
	if (a?.lockedUntil && a.lockedUntil > now) return back(lang, LOGIN_ERROR.locked);
	if (!a || !a.passHash || !verifyPass(String(b.pass ?? ""), a.passHash)) {
		if (a && cfg.lockout.enabled && await recordLoginFailure(a.id, cfg.lockout.maxFailures, cfg.lockout.minutes, now)) return back(lang, LOGIN_ERROR.locked);
		return back(lang, LOGIN_ERROR.bad);
	}
	await resetLoginFailures(a.id);
	if (a.totpEnabled && a.totpSecret && totpAllowed(cfg)) return new Response(null, {
		status: 303,
		headers: {
			Location: `${ROUTES.connexion[lang]}?local=1&step=${LOGIN_STEP.totp}`,
			"Set-Cookie": `pending=${encodeURIComponent(makePending(a.id, now))}; HttpOnly; Path=/; Max-Age=${PENDING_TTL_MS / 1e3}; SameSite=Lax`
		}
	});
	return new Response(null, {
		status: 303,
		headers: {
			Location: ROUTES.appareils[lang],
			"Set-Cookie": `sid=${encodeURIComponent(makeSession(a.id))}; HttpOnly; Path=/; SameSite=Lax`
		}
	});
};
// \0virtual:astro:page:src/pages/api/login@_@ts
var page = () => login_exports;
export { page };
