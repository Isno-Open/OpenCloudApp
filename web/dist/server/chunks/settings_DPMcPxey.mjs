import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$ParametresView } from "./ParametresView_CX2AE_wb.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/en/settings.astro
var settings_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Settings,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Settings = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Settings;
	const lang = LANG.en;
	if (!await requireAdmin(Astro.request)) return Astro.redirect(ROUTES.appareils[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).settingsTitle}`,
		"lang": lang,
		"altUrl": ROUTES.parametres[LANG.fr]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "ParametresView", $$ParametresView, { "lang": lang })}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/settings.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/settings.astro";
var $$url = "/en/settings";
// \0virtual:astro:page:src/pages/en/settings@_@astro
var page = () => settings_exports;
export { page };
