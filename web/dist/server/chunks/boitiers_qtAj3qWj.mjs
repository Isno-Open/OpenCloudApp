import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/boitiers.astro
var boitiers_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Boitiers,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Boitiers = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Boitiers;
	return Astro.redirect(ROUTES.appareils[LANG.fr]);
}, "/home/olivier/projects/isno-cloud/web/src/pages/boitiers.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/boitiers.astro";
var $$url = "/boitiers";
// \0virtual:astro:page:src/pages/boitiers@_@astro
var page = () => boitiers_exports;
export { page };
