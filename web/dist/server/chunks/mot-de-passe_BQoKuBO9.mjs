import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$BareLayout } from "./BareLayout_DyhOi8Zo.mjs";
import { t as $$PasswordView } from "./PasswordView_WjoOsGCI.mjs";
import { t as accountFromLink } from "./set_Cs6cOwNe.mjs";
import { r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { l as t, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/mot-de-passe.astro
var mot_de_passe_exports = /* @__PURE__ */ __exportAll({
	default: () => $$MotDePasse,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$MotDePasse = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$MotDePasse;
	const lang = LANG.fr;
	const token = Astro.url.searchParams.get("t") ?? "";
	const valid = !!token && !!await accountFromLink(token);
	return renderTemplate`${renderComponent($$result, "BareLayout", $$BareLayout, {
		"title": t(lang).setPasswordTitle,
		"lang": lang
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PasswordView", $$PasswordView, {
		"lang": lang,
		"mode": "set",
		"token": token,
		"valid": valid,
		"minLength": localAccountsSettings().passwordMinLength
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/mot-de-passe.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/mot-de-passe.astro";
var $$url = "/mot-de-passe";
// \0virtual:astro:page:src/pages/mot-de-passe@_@astro
var page = () => mot_de_passe_exports;
export { page };
