import { E as renderSlot, F as unescapeHTML, N as addAttribute, j as renderHead, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as SPONSOR } from "./sponsor_-_9WcsFh.mjs";
import { i as adminNavItems, l as t, o as navItems, s as otherLang } from "./i18n_CIzekdEZ.mjs";
import { _ as CAPABILITY, f as hasCapability, t as currentAccount } from "./auth_Da2rUxTp.mjs";
import { n as portalNameIsCustom, t as portalName } from "./portal_DsrEHO8S.mjs";
// src/layouts/CloudLayout.astro
createAstro("https://astro.build");
var $$CloudLayout = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$CloudLayout;
	const FLAG = {
		fr: "<svg viewBox=\"0 0 3 2\" aria-hidden=\"true\"><rect width=\"3\" height=\"2\" fill=\"#fff\"/><rect width=\"1\" height=\"2\" fill=\"#0055A4\"/><rect x=\"2\" width=\"1\" height=\"2\" fill=\"#EF4135\"/></svg>",
		en: "<svg viewBox=\"0 0 60 30\" aria-hidden=\"true\"><clipPath id=\"lsuk\"><path d=\"M0 0v30h60V0z\"/></clipPath><g clip-path=\"url(#lsuk)\"><path d=\"M0 0v30h60V0z\" fill=\"#012169\"/><path d=\"M0 0l60 30m0-30L0 30\" stroke=\"#fff\" stroke-width=\"6\"/><path d=\"M0 0l60 30m0-30L0 30\" stroke=\"#C8102E\" stroke-width=\"4\"/><path d=\"M30 0v30M0 15h60\" stroke=\"#fff\" stroke-width=\"10\"/><path d=\"M30 0v30M0 15h60\" stroke=\"#C8102E\" stroke-width=\"6\"/></g></svg>"
	};
	const { title, lang, altUrl } = Astro.props;
	const s = t(lang);
	const other = otherLang(lang);
	const path = Astro.url.pathname;
	const account = await currentAccount(Astro.request);
	const nav = [...navItems(lang), ...account?.admin ? adminNavItems(lang, { userAdmin: hasCapability(CAPABILITY.userAdmin) }) : []];
	return renderTemplate`<html${addAttribute(lang, "lang")}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>${title ? `${title} · ${portalName()}` : portalName()}</title><link rel="alternate"${addAttribute(lang, "hreflang")}${addAttribute(path, "href")}><link rel="alternate"${addAttribute(other, "hreflang")}${addAttribute(altUrl, "href")}><script>
    try { if (localStorage.getItem('theme') === 'light') document.documentElement.setAttribute('data-theme', 'light'); } catch (e) {}
  <\/script><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap">${renderHead($$result)}</head><body><header class="topbar"><div class="topbar-inner"><a class="brand"${addAttribute(nav[0].href, "href")}${addAttribute(s.brandAria, "aria-label")}><svg class="rf" viewBox="0 0 28 28" aria-hidden="true"><circle cx="6" cy="14" r="2.6" fill="currentColor"></circle><g fill="none" stroke="currentColor" stroke-linecap="round"><path d="M11 8 A8 8 0 0 1 11 20" stroke-width="2.2"></path><path d="M15.5 5 A12.5 12.5 0 0 1 15.5 23" stroke-width="2.2" opacity=".65"></path><path d="M20 2.5 A16.5 16.5 0 0 1 20 25.5" stroke-width="2" opacity=".38"></path></g></svg>${portalNameIsCustom() ? renderTemplate`<span>${portalName()}</span>` : renderTemplate`<span>isno<span class="tld">.fr</span></span>`}</a><button class="burger" id="menuToggle" type="button"${addAttribute(s.menu, "aria-label")} aria-expanded="false" aria-controls="navLinks"><svg class="bars" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"></path></svg><svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"></path></svg></button><nav class="topbar-links" id="navLinks">${nav.map((n) => renderTemplate`<a${addAttribute(["nav", { active: n.active(path) }], "class:list")}${addAttribute(n.href, "href")}>${n.label}</a>`)}<div class="topbar-controls"><a class="lang-switch"${addAttribute(altUrl, "href")}${addAttribute(other, "hreflang")}${addAttribute(s.langSwitch, "aria-label")}><span class="flag">${unescapeHTML(FLAG[other])}</span>${s.langName}</a><button class="theme-toggle" id="themeToggle" type="button"${addAttribute(s.themeToggle, "aria-label")}><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg><svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg></button></div></nav></div></header><main class="wrap">${renderSlot($$result, $$slots["default"])}<p class="foot">${s.footSponsor} <a${addAttribute(SPONSOR.url, "href")} target="_blank" rel="noopener">${SPONSOR.name}</a></p></main><script>
    (function () {
      var root = document.documentElement;
      var tb = document.getElementById('themeToggle');
      if (tb) tb.addEventListener('click', function () {
        var light = root.getAttribute('data-theme') === 'light';
        if (light) { root.removeAttribute('data-theme'); try { localStorage.setItem('theme', 'dark'); } catch (e) {} }
        else { root.setAttribute('data-theme', 'light'); try { localStorage.setItem('theme', 'light'); } catch (e) {} }
      });
      var mt = document.getElementById('menuToggle'), nav = document.getElementById('navLinks');
      if (mt && nav) {
        function close() { nav.classList.remove('open'); mt.setAttribute('aria-expanded', 'false'); }
        mt.addEventListener('click', function (e) { e.stopPropagation(); var o = nav.classList.toggle('open'); mt.setAttribute('aria-expanded', o ? 'true' : 'false'); });
        document.addEventListener('click', function (e) { if (nav.classList.contains('open') && !nav.contains(e.target) && e.target !== mt) close(); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
      }
    })();
  <\/script></body></html>`;
}, "/home/olivier/projects/isno-cloud/web/src/layouts/CloudLayout.astro", void 0);
export { $$CloudLayout as t };
