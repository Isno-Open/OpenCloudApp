import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$UtilisateursView } from "./UtilisateursView_DpgyF1xu.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/utilisateurs.astro
var utilisateurs_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Utilisateurs,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Utilisateurs = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Utilisateurs;
	const lang = LANG.fr;
	const acc = await requireUserAdmin(Astro.request);
	if (!acc) return Astro.redirect(ROUTES.appareils[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).usersTitle}`,
		"lang": lang,
		"altUrl": ROUTES.utilisateurs[LANG.en]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "UtilisateursView", $$UtilisateursView, {
		"lang": lang,
		"accountId": acc
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/utilisateurs.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/utilisateurs.astro";
var $$url = "/utilisateurs";
// \0virtual:astro:page:src/pages/utilisateurs@_@astro
var page = () => utilisateurs_exports;
export { page };
