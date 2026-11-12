import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$AjouterView } from "./AjouterView_D-SDRt2d.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/en/add.astro
var add_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Add,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Add = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Add;
	const lang = LANG.en;
	if (!await resolveAccountId(Astro.request)) return Astro.redirect(ROUTES.connexion[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).addTitle}`,
		"lang": lang,
		"altUrl": ROUTES.ajouter[LANG.fr]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AjouterView", $$AjouterView, { "lang": lang })}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/add.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/add.astro";
var $$url = "/en/add";
// \0virtual:astro:page:src/pages/en/add@_@astro
var page = () => add_exports;
export { page };
