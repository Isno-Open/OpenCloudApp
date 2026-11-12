import { E as renderSlot, N as addAttribute, j as renderHead, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as SPONSOR } from "./sponsor_-_9WcsFh.mjs";
import { l as t } from "./i18n_CIzekdEZ.mjs";
import { t as portalName } from "./portal_DsrEHO8S.mjs";
// src/layouts/BareLayout.astro
createAstro("https://astro.build");
var $$BareLayout = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BareLayout;
	const { title, lang } = Astro.props;
	return renderTemplate`<html${addAttribute(lang, "lang")}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${title ? `${title} · ${portalName()}` : portalName()}</title><script>
    try { if (localStorage.getItem('theme') === 'light') document.documentElement.setAttribute('data-theme', 'light'); } catch (e) {}
  <\/script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">${renderHead($$result)}</head><body><main class="bare-wrap">${renderSlot($$result, $$slots["default"])}</main><p class="foot">${t(lang).footSponsor} <a${addAttribute(SPONSOR.url, "href")} target="_blank" rel="noopener">${SPONSOR.name}</a></p></body></html>`;
}, "/home/olivier/projects/isno-cloud/web/src/layouts/BareLayout.astro", void 0);
export { $$BareLayout as t };
