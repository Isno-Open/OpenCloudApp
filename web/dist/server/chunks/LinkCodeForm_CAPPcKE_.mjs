import { A as maybeRenderHead, N as addAttribute, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
// src/components/LinkCodeForm.astro
createAstro("https://astro.build");
var $$LinkCodeForm = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$LinkCodeForm;
	const { lang, value = "" } = Astro.props;
	const s = t(lang);
	return renderTemplate`${maybeRenderHead($$result)}<form class="linkcode" method="get"${addAttribute(ROUTES.lier[lang], "action")}><label for="linkcode-input">${s.linkCodeLabel}</label><div class="linkcode-row"><input id="linkcode-input" name="code" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="12"${addAttribute(s.linkCodePh, "placeholder")}${addAttribute(value, "value")} required><button class="btn primary" type="submit">${s.linkContinue}</button></div></form>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/LinkCodeForm.astro", void 0);
export { $$LinkCodeForm as t };
