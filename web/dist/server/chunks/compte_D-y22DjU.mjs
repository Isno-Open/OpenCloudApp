import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$CompteView } from "./CompteView_vlW7LYTS.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/compte.astro
var compte_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Compte,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Compte = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Compte;
	const lang = LANG.fr;
	const acc = await resolveAccountId(Astro.request);
	if (!acc) return Astro.redirect(ROUTES.connexion[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).accountTitle}`,
		"lang": lang,
		"altUrl": ROUTES.compte[LANG.en]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "CompteView", $$CompteView, {
		"lang": lang,
		"accountId": acc
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/compte.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/compte.astro";
var $$url = "/compte";
// \0virtual:astro:page:src/pages/compte@_@astro
var page = () => compte_exports;
export { page };
