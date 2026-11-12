import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/en/boxes.astro
var boxes_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Boxes,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Boxes = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Boxes;
	return Astro.redirect(ROUTES.appareils[LANG.en]);
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/boxes.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/boxes.astro";
var $$url = "/en/boxes";
// \0virtual:astro:page:src/pages/en/boxes@_@astro
var page = () => boxes_exports;
export { page };
