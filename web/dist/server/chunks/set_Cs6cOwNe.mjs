import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { E as setAccountPass, m as getAccount, t as boot, w as resetLoginFailures } from "./boot_CuD6Xa_G.mjs";
import { u as hashPass } from "./config_2VUiG471.mjs";
import { i as readAccountToken, r as peekAccountToken, t as ACCOUNT_TOKEN } from "./account-token_D2XBZ92b.mjs";
import { o as signingKey } from "./session_1DdEKdyP.mjs";
import { r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/password/set.ts
var set_exports = /* @__PURE__ */ __exportAll({
	POST: () => POST,
	accountFromLink: () => accountFromLink
});
/** Compte vise par un lien d'invitation OU de reinitialisation encore valable. */
async function accountFromLink(token) {
	await boot();
	for (const purpose of Object.values(ACCOUNT_TOKEN)) {
		const candidate = peekAccountToken(signingKey(), token, purpose);
		if (!candidate) continue;
		const a = await getAccount(candidate);
		if (!a) return null;
		return readAccountToken(signingKey(), token, purpose, (id) => id === a.id ? a.passHash : void 0);
	}
	return null;
}
var POST = async ({ request }) => {
	const b = await readBody(request);
	const id = await accountFromLink(String(b.token ?? ""));
	if (!id) return json(400, { error: "lien expiré ou déjà utilisé" });
	const password = String(b.password ?? "");
	const min = localAccountsSettings().passwordMinLength;
	if (password.length < min) return json(400, { error: `mot de passe trop court (${min} caractères minimum)` });
	await setAccountPass(id, hashPass(password));
	await resetLoginFailures(id);
	return json(200, { ok: true });
};
export { set_exports as n, accountFromLink as t };
