import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { D as setTotp, O as setTotpLastStep, m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { r as verifyTotp } from "./totp_BDcjkrTw.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/account/totp/confirm.ts
var confirm_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const id = await resolveAccountId(request);
	if (!id) return json(401, { error: "unauthorized" });
	const a = await getAccount(id);
	if (!a?.totpSecret || a.totpEnabled) return json(409, { error: "aucune activation en cours" });
	const step = verifyTotp(a.totpSecret, String((await readBody(request)).code ?? ""), Date.now());
	if (step === null) return json(400, { error: "code incorrect" });
	await setTotp(id, a.totpSecret, true);
	await setTotpLastStep(id, step);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/account/totp/confirm@_@ts
var page = () => confirm_exports;
export { page };
