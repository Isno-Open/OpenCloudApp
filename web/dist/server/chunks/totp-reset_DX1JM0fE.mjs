import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { D as setTotp, m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/user/totp-reset.ts
var totp_reset_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireUserAdmin(request)) return json(403, { error: "forbidden" });
	const id = String((await readBody(request)).id ?? "");
	if (!await getAccount(id)) return json(404, { error: "compte inconnu" });
	await setTotp(id, null, false);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/user/totp-reset@_@ts
var page = () => totp_reset_exports;
export { page };
