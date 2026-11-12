import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { D as setTotp, m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { r as verifyTotp } from "./totp_BDcjkrTw.mjs";
import { a as totpRequiredFor, r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/account/totp/disable.ts
var disable_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const id = await resolveAccountId(request);
	if (!id) return json(401, { error: "unauthorized" });
	const a = await getAccount(id);
	if (!a?.totpEnabled || !a.totpSecret) return json(409, { error: "pas activée" });
	if (totpRequiredFor(localAccountsSettings(), a.admin)) return json(409, { error: "exigée sur ce portail" });
	if (verifyTotp(a.totpSecret, String((await readBody(request)).code ?? ""), Date.now(), a.totpLastStep) === null) return json(400, { error: "code incorrect" });
	await setTotp(id, null, false);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/account/totp/disable@_@ts
var page = () => disable_exports;
export { page };
