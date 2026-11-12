import { A as maybeRenderHead, C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { c as BUILTIN_PLUGINS, d as enabledPlugins, p as installedPlugins } from "./auth_Da2rUxTp.mjs";
import { o as loadConfig } from "./config_2VUiG471.mjs";
import { o as listCatalogPlugins } from "./supervisor_DmaMSdpl.mjs";
import { c as pluginHref, l as t } from "./i18n_CIzekdEZ.mjs";
import { a as attr, n as derived, o as escape_html, r as ensure_array_like, t as attr_style } from "./dev_B9Qw5q62.mjs";
// src/components/islands/PluginsPanel.svelte
function PluginsPanel($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const { lang, installed, entries, sources, catalogError } = $$props;
		const s = derived(() => t(lang));
		let busy = false;
		let error = null;
		let message = "";
		let progress = {};
		let sourceUrl = "";
		let sourceError = null;
		$$renderer.push(`<div class="panel"><h3>${escape_html(s().pluginsInstalled)}</h3> `);
		if (installed.length === 0) $$renderer.push(`<!--[0--><p class="hint" style="margin:0">${escape_html(s().pluginsNoneInstalled)}</p>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <!--[-->`);
		const each_array = ensure_array_like(installed);
		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let p = each_array[$$index];
			$$renderer.push(`<div class="plugin-row"><div class="plugin-main"><span class="k">${escape_html(p.title)} <span class="ro">${escape_html(p.builtin ? s().pluginBuiltin : s().pluginExternal)}</span></span> `);
			if (p.description) $$renderer.push(`<!--[0--><span class="hint">${escape_html(p.description[lang])}</span>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="plugin-act">`);
			if (p.configurable) $$renderer.push(`<!--[0--><a class="gear"${attr("href", pluginHref(p.id, lang))}${attr("title", s().pluginSettings)}${attr("aria-label", `${s().pluginSettings} : ${p.title}`)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg></a>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (p.enabled) $$renderer.push(`<!--[0--><button class="btn ghost sm" type="button"${attr("data-disable", p.id)}${attr("disabled", busy, true)}>${escape_html(p.builtin ? s().pluginDisable : s().pluginRemove)}</button>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<!--]--></div> <div class="panel" style="margin-top:.9rem"><h3>${escape_html(s().pluginsCatalogTitle)}</h3> `);
		if (catalogError !== null) $$renderer.push(`<!--[0--><p class="formerr" style="margin:0 0 .5rem">${escape_html(s().pluginsCatalogDown)} (${escape_html(catalogError)})</p>`);
		else $$renderer.push("<!--[-1-->");
		$$renderer.push(`<!--]--> <!--[-->`);
		const each_array_1 = ensure_array_like(entries);
		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let p = each_array_1[$$index_1];
			$$renderer.push(`<div class="plugin-row"><div class="plugin-main"><span class="k">${escape_html(p.title)} <span class="ro">${escape_html(p.origin)}</span>`);
			if (p.version) $$renderer.push(`<!--[0--><span class="ro">${escape_html(p.version)}</span>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></span>`);
			if (p.description) $$renderer.push(`<!--[0--><span class="hint">${escape_html(p.description[lang])}</span>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--> `);
			if (!p.builtin) $$renderer.push(`<!--[0--><div class="bar"${attr("hidden", progress[p.id] === void 0)}${attr("data-bar", p.id)}><span${attr_style(`width:${progress[p.id] ?? 0}%`)}></span></div>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="plugin-act">`);
			if (p.enabled && p.updateAvailable) $$renderer.push(`<!--[0--><button class="btn primary sm" type="button"${attr("data-install", p.id)}${attr("disabled", busy, true)}>${escape_html(s().pluginUpdate(p.installedVersion ?? "?", p.version ?? "?"))}</button>`);
			else if (p.enabled) $$renderer.push(`<!--[1--><span class="tag-ok">✓ ${escape_html(s().pluginIsInstalled)}</span>`);
			else if (p.builtin) $$renderer.push(`<!--[2--><button class="btn primary sm" type="button"${attr("data-enable", p.id)}${attr("disabled", busy, true)}>${escape_html(s().pluginEnable)}</button>`);
			else $$renderer.push(`<!--[-1--><button class="btn primary sm" type="button"${attr("data-install", p.id)}${attr("disabled", busy, true)}>${escape_html(s().pluginInstall)}</button>`);
			$$renderer.push(`<!--]--></div></div>`);
		}
		$$renderer.push(`<!--]--> <p class="formerr" id="pluginsErr"${attr("hidden", true)}>${escape_html(error)}</p> <p class="savemsg" id="pluginsMsg">${escape_html(message)}</p></div> <form class="panel" id="sourcesForm" style="margin-top:.9rem"><h3>${escape_html(s().pluginSourcesTitle)}</h3> <div class="plugin-row"><div class="plugin-main"><span class="k">${escape_html(s().pluginCatalog)}</span><span class="hint">${escape_html(s().pluginSourceIsno)}</span></div></div> <!--[-->`);
		const each_array_2 = ensure_array_like(sources);
		for (let $$index_2 = 0, $$length = each_array_2.length; $$index_2 < $$length; $$index_2++) {
			let src = each_array_2[$$index_2];
			$$renderer.push(`<div class="plugin-row"><div class="plugin-main"><span class="k mono">${escape_html(src.url)}</span>`);
			if (src.error) $$renderer.push(`<!--[0--><span class="formerr" style="margin:0">${escape_html(src.error)}</span>`);
			else $$renderer.push("<!--[-1-->");
			$$renderer.push(`<!--]--></div> <div class="plugin-act"><button class="btn ghost sm" type="button"${attr("data-source-remove", src.url)}>${escape_html(s().pluginSourceRemove)}</button></div></div>`);
		}
		$$renderer.push(`<!--]--> <div class="field" style="margin-top:.6rem"><label for="srcUrl">${escape_html(s().pluginSourceAdd)}</label> <div class="row"><input id="srcUrl" type="url" spellcheck="false" placeholder="https://exemple.fr/plugins.json" style="flex:1"${attr("value", sourceUrl)}/><button class="btn ghost" type="submit">${escape_html(s().pluginSourceAddBtn)}</button></div> <span class="hint">${escape_html(s().pluginSourceWarn)}</span></div> <p class="formerr" id="srcErr"${attr("hidden", true)}>${escape_html(sourceError)}</p></form>`);
	});
}
// src/components/views/PluginsView.astro
createAstro("https://astro.build");
var $$PluginsView = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$PluginsView;
	const { lang } = Astro.props;
	const s = t(lang);
	const enabled = enabledPlugins();
	const sourceUrls = loadConfig()?.pluginSources ?? [];
	const catalog = await listCatalogPlugins(sourceUrls);
	const installed = installedPlugins().map((p) => ({
		...p,
		enabled: enabled.includes(p.id)
	}));
	const entries = [...Object.values(BUILTIN_PLUGINS).map((p) => ({
		id: p.id,
		title: p.title,
		description: p.description,
		origin: s.pluginBuiltin,
		builtin: true,
		enabled: enabled.includes(p.id)
	})), ...catalog.ok ? catalog.plugins.map((p) => ({
		id: p.id,
		title: p.title,
		description: p.description,
		origin: p.official ? s.pluginCatalog : p.local ? s.pluginLocal : new URL(p.source).host,
		builtin: false,
		enabled: enabled.includes(p.id),
		version: p.version,
		installedVersion: p.installedVersion,
		updateAvailable: p.updateAvailable
	})) : []];
	const sourceErrors = catalog.ok ? catalog.errors : [];
	const sources = sourceUrls.map((url) => {
		const err = sourceErrors.find((e) => e.source === url);
		return err ? {
			url,
			error: err.error
		} : { url };
	});
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.pluginsTitle}</h1></div><p class="lead">${s.pluginsLead}</p>${renderComponent($$result, "PluginsPanel", PluginsPanel, {
		"client:load": true,
		"lang": lang,
		"installed": installed,
		"entries": entries,
		"sources": sources,
		"catalogError": catalog.ok ? null : catalog.error,
		"client:component-hydration": "load",
		"client:component-path": "/home/olivier/projects/isno-cloud/web/src/components/islands/PluginsPanel.svelte",
		"client:component-export": "default"
	})}`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/PluginsView.astro", void 0);
export { $$PluginsView as t };
