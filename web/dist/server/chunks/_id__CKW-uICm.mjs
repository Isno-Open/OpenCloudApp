import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$PluginSettingsView } from "./PluginSettingsView_Cya9JHlV.mjs";
import { a as requireAdmin, m as pluginSettingsForm, p as installedPlugins } from "./auth_Da2rUxTp.mjs";
import { c as pluginHref, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/plugins/[id].astro
var _id__exports = /* @__PURE__ */ __exportAll({
	default: () => $$Id,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Id = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Id;
	const lang = LANG.fr;
	if (!await requireAdmin(Astro.request)) return Astro.redirect(ROUTES.appareils[lang]);
	const id = Astro.params.id ?? "";
	const plugin = installedPlugins().find((p) => p.id === id);
	const form = plugin ? pluginSettingsForm(id) : null;
	if (!plugin || !form) return Astro.redirect(ROUTES.plugins[lang]);
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": plugin.title,
		"lang": lang,
		"altUrl": pluginHref(id, LANG.en)
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "PluginSettingsView", $$PluginSettingsView, {
		"lang": lang,
		"plugin": plugin,
		"fields": form.fields,
		"values": form.values
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/plugins/[id].astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/plugins/[id].astro";
var $$url = "/plugins/[id]";
// \0virtual:astro:page:src/pages/plugins/[id]@_@astro
var page = () => _id__exports;
export { page };
