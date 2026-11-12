import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { O as setTotpLastStep, b as recordLoginFailure, m as getAccount, t as boot } from "./boot_CuD6Xa_G.mjs";
import { i as readPending, r as makeSession } from "./session_1DdEKdyP.mjs";
import { r as verifyTotp } from "./totp_BDcjkrTw.mjs";
import { r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { n as readBody } from "./http_GIg9YBvo.mjs";
import { n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { r as LOGIN_STEP, t as LOGIN_ERROR } from "./login_CzMTT3CN.mjs";
// src/pages/api/login/totp.ts
var totp_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	await boot();
	const b = await readBody(request);
	const lang = b.lang === LANG.en ? LANG.en : LANG.fr;
	const login = ROUTES.connexion[lang];
	const now = Date.now();
	const id = readPending(request.headers.get("cookie") ?? void 0, now);
	if (!id) return new Response(null, {
		status: 303,
		headers: { Location: `${login}?local=1&e=${LOGIN_ERROR.expired}` }
	});
	const a = await getAccount(id);
	const step = a?.totpSecret ? verifyTotp(a.totpSecret, String(b.code ?? ""), now, a.totpLastStep) : null;
	if (!a || step === null) {
		const cfg = localAccountsSettings();
		if (a && cfg.lockout.enabled && await recordLoginFailure(a.id, cfg.lockout.maxFailures, cfg.lockout.minutes, now)) return new Response(null, {
			status: 303,
			headers: {
				Location: `${login}?local=1&e=${LOGIN_ERROR.locked}`,
				"Set-Cookie": "pending=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"
			}
		});
		return new Response(null, {
			status: 303,
			headers: { Location: `${login}?local=1&step=${LOGIN_STEP.totp}&e=${LOGIN_ERROR.totp}` }
		});
	}
	await setTotpLastStep(a.id, step);
	const headers = new Headers({ Location: ROUTES.appareils[lang] });
	headers.append("Set-Cookie", "pending=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax");
	headers.append("Set-Cookie", `sid=${encodeURIComponent(makeSession(a.id))}; HttpOnly; Path=/; SameSite=Lax`);
	return new Response(null, {
		status: 303,
		headers
	});
};
// \0virtual:astro:page:src/pages/api/login/totp@_@ts
var page = () => totp_exports;
export { page };
