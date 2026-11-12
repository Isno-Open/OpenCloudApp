import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { m as getAccount, t as boot } from "./boot_CuD6Xa_G.mjs";
import { n as mailEnabled } from "./mail_DXXml3Fw.mjs";
import { n as localLoginEnabled } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { n as sendReset } from "./mailer__27al7tC.mjs";
import { t as normalizeEmail } from "./validate_DM5ZsbnO.mjs";
import { t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/api/password/forgot.ts
var forgot_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	await boot();
	if (!await localLoginEnabled() || !mailEnabled()) return json(404, { error: "indisponible" });
	const b = await readBody(request);
	const email = normalizeEmail(b.email);
	const lang = b.lang === LANG.en ? LANG.en : LANG.fr;
	if (email) getAccount(email).then((a) => a ? sendReset(lang, a) : null).then((r) => {
		if (r && !r.ok) console.error("[mot de passe oublie] envoi :", r.error);
	}).catch((e) => console.error("[mot de passe oublie]", e instanceof Error ? e.message : e));
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/password/forgot@_@ts
var page = () => forgot_exports;
export { page };
