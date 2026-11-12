import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { D as setTotp, m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { n as otpauthUri, t as newTotpSecret } from "./totp_BDcjkrTw.mjs";
import { i as totpAllowed, r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { t as json } from "./http_GIg9YBvo.mjs";
import { t as portalName } from "./portal_DsrEHO8S.mjs";
import QRCode from "qrcode";
// src/pages/api/account/totp/start.ts
var start_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const id = await resolveAccountId(request);
	if (!id) return json(401, { error: "unauthorized" });
	if (!totpAllowed(localAccountsSettings())) return json(403, { error: "désactivée sur ce portail" });
	const a = await getAccount(id);
	if (!a) return json(401, { error: "unauthorized" });
	if (a.totpEnabled) return json(409, { error: "déjà activée" });
	const secret = newTotpSecret();
	await setTotp(id, secret, false);
	const svg = await QRCode.toString(otpauthUri(portalName(), id, secret), {
		type: "svg",
		margin: 1,
		errorCorrectionLevel: "M"
	});
	return json(200, {
		svg,
		secret
	});
};
// \0virtual:astro:page:src/pages/api/account/totp/start@_@ts
var page = () => start_exports;
export { page };
