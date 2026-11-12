import { A as maybeRenderHead, N as addAttribute, P as defineScriptVars, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
// src/components/views/BoitierView.astro
createAstro("https://astro.build");
var $$BoitierView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$BoitierView;
	const { boitier: b, lang } = Astro.props;
	const s = t(lang);
	return renderTemplate`${maybeRenderHead($$result)}<a class="back"${addAttribute(ROUTES.appareils[lang], "href")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"></path></svg> ${s.backBoxes}</a><div class="page-head"><h1>${b.name}</h1><span${addAttribute(["pill", { "state-off": !b.online }], "class:list")}><span class="dot"></span>${b.online ? s.online : s.offlineShort}</span><span class="pill mono">${b.firmware}</span></div><p class="lead">${s.leadBoitier(b.id, b.count, b.uptime)}</p><div class="subtabs" role="tablist"><button class="subtab active" type="button" data-sub="cfg">${s.tabConfig}</button><button class="subtab" type="button" data-sub="manage">${s.tabManage}</button></div><div class="subpanel" data-panel="cfg"><div class="cfg-grid"><div class="panel"><h3>${s.availability} <span class="ro">${s.readonly}</span></h3><div class="kv"><span class="k">${s.state}</span><span class="v">${b.online ? s.online : s.offlineShort}</span></div>${b.uptime && renderTemplate`<div class="kv"><span class="k">${s.since}</span><span class="v">${b.uptime}</span></div>`}${b.wifi?.rssiDbm != null && renderTemplate`<div class="kv"><span class="k">${s.wifiSignal}</span><span class="v">${b.wifi.rssiDbm} dBm</span></div>`}${b.radios && renderTemplate`<div class="kv"><span class="k">${s.radios}</span><span class="v">${b.radios}</span></div>`}<div class="kv"><span class="k">${s.firmware}</span><span class="v"${addAttribute(b.updateAvailable ? "color:var(--warn)" : void 0, "style")}>${b.updateAvailable ? s.updateAvailable : s.upToDate}</span></div></div><div class="panel"><h3>${s.comingSoon} <span class="ro">${s.readonly}</span></h3><p class="note">${s.comingSoonNote}</p></div></div></div><div class="subpanel" data-panel="manage" hidden><form class="panel" id="renameForm"${addAttribute(b.id, "data-boitier")} style="margin-bottom:.8rem"><h3>${s.boxName}</h3><div class="field"><label for="bx-name">${s.boxNameHint}</label><input id="bx-name" name="name" type="text"${addAttribute(b.name, "value")} required></div><button class="btn primary" type="submit">${s.rename}</button></form><div class="danger-zone"><h3>${s.deleteTitle}</h3><p class="note">${s.deleteNote}</p><button class="btn danger" type="button" id="delBtn" style="margin-top:.5rem">${s.deleteBtn}</button><div id="delConfirm" hidden style="margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center"><span class="note" style="margin:0">${s.confirmDelete(b.name)}</span><button class="btn danger sm" type="button" id="delYes">${s.yesDelete}</button><button class="btn ghost sm" type="button" id="delCancel">${s.cancel}</button></div></div></div><script>(function(){${defineScriptVars({
		deviceId: b.id,
		boxesUrl: ROUTES.appareils[lang],
		renameErr: s.renameError,
		deleteErr: s.deleteError
	})}
  (function () {
    document.querySelectorAll('.subtab').forEach(function (t) {
      t.addEventListener('click', function () {
        document.querySelectorAll('.subtab').forEach(function (x) { x.classList.remove('active'); });
        t.classList.add('active');
        var p = t.getAttribute('data-sub');
        document.querySelectorAll('.subpanel').forEach(function (x) { x.hidden = (x.getAttribute('data-panel') !== p); });
      });
    });
    var form = document.getElementById('renameForm');
    if (form) form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.querySelector('input[name=name]').value.trim();
      if (!name) return;
      fetch('/api/boitier/rename', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId, name: name }) })
        .then(function (r) { if (r.ok) location.reload(); else alert(renameErr); })
        .catch(function () { alert(renameErr); });
    });
    var db = document.getElementById('delBtn'), dc = document.getElementById('delConfirm'), dx = document.getElementById('delCancel'), dy = document.getElementById('delYes');
    if (db && dc) db.addEventListener('click', function () { dc.hidden = false; db.hidden = true; });
    if (dx && dc && db) dx.addEventListener('click', function () { dc.hidden = true; db.hidden = false; });
    if (dy) dy.addEventListener('click', function () {
      fetch('/api/boitier/delete', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }) })
        .then(function (r) { if (r.ok) location.href = boxesUrl; else alert(deleteErr); })
        .catch(function () { alert(deleteErr); });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/BoitierView.astro", void 0);
export { $$BoitierView as t };
