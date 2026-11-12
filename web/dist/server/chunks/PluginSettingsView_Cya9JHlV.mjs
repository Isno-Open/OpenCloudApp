import { A as maybeRenderHead, N as addAttribute, P as defineScriptVars, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { o as SETTING_KIND } from "./local-accounts-settings_vLu63073.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
// src/components/views/PluginSettingsView.astro
createAstro("https://astro.build");
var $$PluginSettingsView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$PluginSettingsView;
	const { lang, plugin, fields, values } = Astro.props;
	const s = t(lang);
	const id = (f) => `pf-${f.key}`;
	return renderTemplate`${maybeRenderHead($$result)}<a class="backlink"${addAttribute(ROUTES.plugins[lang], "href")}>← ${s.pluginsTitle}</a><div class="page-head"><h1>${plugin.title}</h1></div><p class="lead">${s.pluginSettingsLead} <span class="ro">${plugin.builtin ? s.pluginBuiltin : s.pluginExternal}</span></p><form class="panel plugin-form" id="pluginForm"${addAttribute(plugin.id, "data-plugin")}>${fields.map((f) => renderTemplate`<div${addAttribute(["pf", { under: !!f.under }], "class:list")}${addAttribute(f.under, "data-under")}>${f.kind === SETTING_KIND.toggle ? renderTemplate`<label class="check"><input type="checkbox"${addAttribute(id(f), "id")}${addAttribute(f.key, "data-key")}${addAttribute(f.kind, "data-kind")}${addAttribute(values[f.key] === true, "checked")}> ${f.label[lang]}</label>` : f.kind === SETTING_KIND.number ? renderTemplate`<div class="field"><label${addAttribute(id(f), "for")}>${f.label[lang]}</label><input${addAttribute(id(f), "id")}${addAttribute(f.key, "data-key")}${addAttribute(f.kind, "data-kind")} type="number"${addAttribute(f.min, "min")}${addAttribute(f.max, "max")}${addAttribute(String(values[f.key] ?? ""), "value")}></div>` : renderTemplate`<div class="field"><label${addAttribute(id(f), "for")}>${f.label[lang]}</label><select${addAttribute(id(f), "id")}${addAttribute(f.key, "data-key")}${addAttribute(f.kind, "data-kind")}>${f.options.map((o) => renderTemplate`<option${addAttribute(o.value, "value")}${addAttribute(o.value === values[f.key], "selected")}>${o.label[lang]}</option>`)}</select></div>`}${f.hint && renderTemplate`<span class="hint">${f.hint[lang]}</span>`}</div>`)}<div class="row end" style="margin-top:.6rem"><span class="savemsg" id="pluginMsg"></span><button class="btn primary" type="submit">${s.saveBtn}</button></div></form><script>(function(){${defineScriptVars({
		okMsg: s.savedMsg,
		errMsg: s.saveError,
		kinds: SETTING_KIND
	})}
  (function () {
    var form = document.getElementById('pluginForm'), msg = document.getElementById('pluginMsg');
    var inputs = form.querySelectorAll('[data-key]');
    // un champ « sous » une case n'est actif que si la case est cochee
    function sync() {
      form.querySelectorAll('[data-under]').forEach(function (row) {
        var parent = form.querySelector('[data-key="' + row.getAttribute('data-under') + '"]');
        row.querySelectorAll('input,select').forEach(function (el) { el.disabled = !!parent && !parent.checked; });
      });
    }
    form.addEventListener('change', sync); sync();
    form.addEventListener('submit', function (e) {
      e.preventDefault(); msg.className = 'savemsg'; msg.textContent = '…';
      var values = {};
      inputs.forEach(function (el) {
        var k = el.getAttribute('data-kind');
        values[el.getAttribute('data-key')] = k === kinds.toggle ? el.checked : k === kinds.number ? Number(el.value) : el.value;
      });
      fetch('/api/settings/plugin', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: form.getAttribute('data-plugin'), values: values }) })
        .then(function (r) { msg.className = 'savemsg ' + (r.ok ? 'ok' : 'err'); msg.textContent = r.ok ? okMsg : errMsg; })
        .catch(function () { msg.className = 'savemsg err'; msg.textContent = errMsg; });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/PluginSettingsView.astro", void 0);
export { $$PluginSettingsView as t };
