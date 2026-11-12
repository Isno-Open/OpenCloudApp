import { A as maybeRenderHead, C as renderComponent, P as defineScriptVars, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$LinkCodeForm } from "./LinkCodeForm_CAPPcKE_.mjs";
import { l as t } from "./i18n_CIzekdEZ.mjs";
// src/components/views/AjouterView.astro
createAstro("https://astro.build");
var $$AjouterView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$AjouterView;
	const { lang } = Astro.props;
	const s = t(lang);
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.addTitle}</h1></div><p class="lead">${s.addLead}</p><div class="card">${renderComponent($$result, "LinkCodeForm", $$LinkCodeForm, { "lang": lang })}</div><div class="card"><div class="add"><div><div style="font-weight:550">${s.getCodeTitle}</div><p class="note" style="margin:.15rem 0 0">${s.getCodeNote}</p></div><button class="btn primary" type="button" id="pairBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>${s.getCodeBtn}</button></div><span class="code" id="pairCode" hidden></span></div><div class="card"><div class="sect-label">${s.howTitle}</div><p class="note">${s.howText}</p></div><script>(function(){${defineScriptVars({
		pairPrefix: s.pairCode("__C__"),
		errPrefix: s.errPrefix("__E__"),
		netErr: s.netErr
	})}
  (function () {
    var btn = document.getElementById('pairBtn'), out = document.getElementById('pairCode');
    if (!btn || !out) return;
    btn.addEventListener('click', function () {
      btn.disabled = true;
      fetch('/api/device/new', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          out.hidden = false;
          out.textContent = d.code ? pairPrefix.replace('__C__', d.code) : errPrefix.replace('__E__', d.error || '');
        })
        .catch(function () { out.hidden = false; out.textContent = netErr; })
        .finally(function () { btn.disabled = false; });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/AjouterView.astro", void 0);
export { $$AjouterView as t };
