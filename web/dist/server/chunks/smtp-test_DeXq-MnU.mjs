import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { i as MAIL_KIND, r as sendTemplated } from "./mailer__27al7tC.mjs";
import { t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/api/settings/smtp-test.ts
var smtp_test_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const me = await requireAdmin(request);
	if (!me) return json(403, { error: "forbidden" });
	const lang = (await readBody(request)).lang === LANG.en ? LANG.en : LANG.fr;
	const r = await sendTemplated(MAIL_KIND.test, lang, me);
	return r.ok ? json(200, {
		ok: true,
		to: me
	}) : json(502, { error: r.error });
};
// \0virtual:astro:page:src/pages/api/settings/smtp-test@_@ts
var page = () => smtp_test_exports;
export { page };
