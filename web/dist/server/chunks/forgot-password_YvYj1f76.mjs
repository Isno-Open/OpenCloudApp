import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$BareLayout } from "./BareLayout_DyhOi8Zo.mjs";
import { t as $$PasswordView } from "./PasswordView_WjoOsGCI.mjs";
import { n as mailEnabled } from "./mail_DXXml3Fw.mjs";
import { t as boot } from "./boot_CuD6Xa_G.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/en/forgot-password.astro
var forgot_password_exports = /* @__PURE__ */ __exportAll({
	default: () => $$ForgotPassword,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$ForgotPassword = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ForgotPassword;
	const lang = LANG.en;
	await boot();
	if (!mailEnabled()) return Astro.redirect(`${ROUTES.connexion[lang]}?local=1`);
	return renderTemplate`${renderComponent($$result, "BareLayout", $$BareLayout, {
		"title": t(lang).forgotTitle,
		"lang": lang
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PasswordView", $$PasswordView, {
		"lang": lang,
		"mode": "forgot"
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/forgot-password.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/forgot-password.astro";
var $$url = "/en/forgot-password";
// \0virtual:astro:page:src/pages/en/forgot-password@_@astro
var page = () => forgot_password_exports;
export { page };
