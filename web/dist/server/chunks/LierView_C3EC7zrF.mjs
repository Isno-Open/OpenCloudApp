import { A as maybeRenderHead, C as renderComponent, N as addAttribute, P as defineScriptVars, k as renderTemplate, w as Fragment } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$LinkCodeForm } from "./LinkCodeForm_CAPPcKE_.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
import { n as LINK_ERROR, r as LINK_VIEW } from "./link_CcbVL7PN.mjs";
// src/components/views/LierView.astro
createAstro("https://astro.build");
var $$LierView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$LierView;
	const { lang, view, code = "", deviceId = "" } = Astro.props;
	const s = t(lang);
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.linkTitle}</h1></div>${view === LINK_VIEW.confirm ? renderTemplate`<div class="panel link-confirm" id="linkConfirm"><h3>${s.linkConfirmTitle}</h3><div class="kv"><span class="k">Code</span><span class="v mono">${code}</span></div><div class="kv"><span class="k">${s.linkIdWord}</span><span class="v mono">${deviceId}</span></div><div class="field"><label for="link-name">${s.linkNameLabel}</label><input id="link-name" type="text" maxlength="60"${addAttribute(s.linkNamePh, "placeholder")}></div><div class="row end"><button class="btn primary" type="button" id="linkBtn">${s.linkConfirmBtn}</button></div><p class="formerr" id="linkErr" hidden></p></div>` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p class="lead">${s.linkLead}</p>${view === LINK_VIEW.invalid && renderTemplate`<p class="formerr" style="margin:0 0 .8rem">${s.linkInvalid}</p>`}<div class="panel">${renderComponent($$result, "LinkCodeForm", $$LinkCodeForm, {
		"lang": lang,
		"value": view === LINK_VIEW.invalid ? code : ""
	})}</div>` })}`}<div class="panel link-done" id="linkDone" hidden><h3>${s.linkDoneTitle}</h3><p class="note">${s.linkDoneNote}</p><div class="row"><a class="btn primary"${addAttribute(ROUTES.appareils[lang], "href")}>${s.linkGoDevices}</a></div></div><script>(function(){${defineScriptVars({
		code,
		ERR: LINK_ERROR,
		invalidMsg: s.linkInvalid,
		capTpl: s.linkCapError(9999),
		netErr: s.netErr
	})}
  (function () {
    var btn = document.getElementById('linkBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var err = document.getElementById('linkErr'); err.hidden = true; btn.disabled = true;
      fetch('/api/device/approve', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: code, name: document.getElementById('link-name').value.trim() }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (res.ok) { document.getElementById('linkConfirm').hidden = true; document.getElementById('linkDone').hidden = false; return; }
          err.hidden = false; btn.disabled = false;
          err.textContent = res.d.error === ERR.cap ? capTpl.replace('9999', String(res.d.cap)) : invalidMsg;
        })
        .catch(function () { err.hidden = false; err.textContent = netErr; btn.disabled = false; });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/LierView.astro", void 0);
export { $$LierView as t };
