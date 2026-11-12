import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$CompteView } from "./CompteView_vlW7LYTS.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/en/account.astro
var account_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Account,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Account = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Account;
	const lang = LANG.en;
	const acc = await resolveAccountId(Astro.request);
	if (!acc) return Astro.redirect(ROUTES.connexion[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).accountTitle}`,
		"lang": lang,
		"altUrl": ROUTES.compte[LANG.fr]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "CompteView", $$CompteView, {
		"lang": lang,
		"accountId": acc
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/account.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/account.astro";
var $$url = "/en/account";
// \0virtual:astro:page:src/pages/en/account@_@astro
var page = () => account_exports;
export { page };
