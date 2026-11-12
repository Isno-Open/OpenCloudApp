import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$AppareilsView } from "./AppareilsView_DyrKNs2o.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { t as LINK_COOKIE } from "./link_CcbVL7PN.mjs";
// src/pages/index.astro
var pages_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Index,
	file: () => $$file,
	url: () => ""
});
createAstro("https://astro.build");
var $$Index = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Index;
	const lang = LANG.fr;
	const acc = await resolveAccountId(Astro.request);
	if (!acc) return Astro.redirect(ROUTES.connexion[lang]);
	const pending = Astro.cookies.get(LINK_COOKIE)?.value;
	if (pending) return Astro.redirect(`${ROUTES.lier[lang]}?code=${encodeURIComponent(pending)}`);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).appareilsTitle}`,
		"lang": lang,
		"altUrl": ROUTES.appareils[LANG.en]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "AppareilsView", $$AppareilsView, {
		"lang": lang,
		"accountId": acc
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/index.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/index.astro";
// \0virtual:astro:page:src/pages/index@_@astro
var page = () => pages_exports;
export { page };
