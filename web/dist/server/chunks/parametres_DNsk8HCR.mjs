import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$ParametresView } from "./ParametresView_CX2AE_wb.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/parametres.astro
var parametres_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Parametres,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Parametres = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Parametres;
	const lang = LANG.fr;
	if (!await requireAdmin(Astro.request)) return Astro.redirect(ROUTES.appareils[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).settingsTitle}`,
		"lang": lang,
		"altUrl": ROUTES.parametres[LANG.en]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "ParametresView", $$ParametresView, { "lang": lang })}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/parametres.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/parametres.astro";
var $$url = "/parametres";
// \0virtual:astro:page:src/pages/parametres@_@astro
var page = () => parametres_exports;
export { page };
