import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$BareLayout } from "./BareLayout_DyhOi8Zo.mjs";
import { t as $$LoginView } from "./LoginView_nUMGdUjH.mjs";
import { n as localLoginEnabled, r as loginRedirect, s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { i as parseLoginError, n as LOGIN_INFO } from "./login_CzMTT3CN.mjs";
import { r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { n as newChallenge, t as captchaSvg } from "./captcha_O9QDSjEd.mjs";
import { o as signingKey } from "./session_1DdEKdyP.mjs";
import { n as mailEnabled } from "./mail_DXXml3Fw.mjs";
// src/pages/connexion.astro
var connexion_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Connexion,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Connexion = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Connexion;
	const lang = LANG.fr;
	if (await resolveAccountId(Astro.request)) return Astro.redirect(ROUTES.appareils[lang]);
	const local = await localLoginEnabled();
	const ext = local && Astro.url.searchParams.get("local") === "1" ? null : await loginRedirect();
	if (ext) return Astro.redirect(ext);
	const error = parseLoginError(Astro.url.searchParams.get("e"));
	const step = Astro.url.searchParams.get("step");
	const captcha = local && localAccountsSettings().captcha ? (() => {
		const c = newChallenge(signingKey());
		return {
			svg: captchaSvg(c.code),
			token: c.token
		};
	})() : null;
	const forgot = local && mailEnabled();
	const info = Astro.url.searchParams.get("ok") === LOGIN_INFO.passwordSet;
	const none = !local;
	return renderTemplate`${renderComponent($$result, "BareLayout", $$BareLayout, {
		"title": `${t(lang).signInTitle}`,
		"lang": lang
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "LoginView", $$LoginView, {
		"lang": lang,
		"error": error,
		"none": none,
		"step": step,
		"captcha": captcha,
		"forgot": forgot,
		"info": info
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/connexion.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/connexion.astro";
var $$url = "/connexion";
// \0virtual:astro:page:src/pages/connexion@_@astro
var page = () => connexion_exports;
export { page };
