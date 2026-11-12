import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$BoitierView } from "./BoitierView_D-kLbPWG.mjs";
import { n as getBoitier } from "./cloud-data_C-XxM6mz.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { a as appareilHref, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/en/box/[id].astro
var _id__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Id,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Id = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Id;
	const lang = LANG.en;
	const acc = await resolveAccountId(Astro.request);
	if (!acc) return Astro.redirect(ROUTES.connexion[lang]);
	const { id } = Astro.params;
	const b = id ? await getBoitier(id, acc) : void 0;
	if (!b) return Astro.redirect(ROUTES.appareils[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${b.name}`,
		"lang": lang,
		"altUrl": appareilHref(b.id, LANG.fr)
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "BoitierView", $$BoitierView, {
		"boitier": b,
		"lang": lang
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/box/[id].astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/box/[id].astro";
var $$url = "/en/box/[id]";
// \0virtual:astro:page:src/pages/en/box/[id]@_@astro
var page = () => _id__exports;
export { page };
