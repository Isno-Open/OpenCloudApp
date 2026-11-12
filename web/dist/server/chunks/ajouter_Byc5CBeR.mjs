import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$AjouterView } from "./AjouterView_D-SDRt2d.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/ajouter.astro
var ajouter_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Ajouter,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Ajouter = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Ajouter;
	const lang = LANG.fr;
	if (!await resolveAccountId(Astro.request)) return Astro.redirect(ROUTES.connexion[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).addTitle}`,
		"lang": lang,
		"altUrl": ROUTES.ajouter[LANG.en]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AjouterView", $$AjouterView, { "lang": lang })}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/ajouter.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/ajouter.astro";
var $$url = "/ajouter";
// \0virtual:astro:page:src/pages/ajouter@_@astro
var page = () => ajouter_exports;
export { page };
