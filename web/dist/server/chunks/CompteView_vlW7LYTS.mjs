import { A as maybeRenderHead, C as renderComponent, P as defineScriptVars, k as renderTemplate, w as Fragment } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as getAccountInfo } from "./cloud-data_C-XxM6mz.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
import { a as totpRequiredFor, i as totpAllowed, r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
// src/components/views/CompteView.astro
createAstro("https://astro.build");
var $$CompteView = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$CompteView;
	const { lang, accountId } = Astro.props;
	const s = t(lang);
	const account = await getAccountInfo(accountId);
	const sec = localAccountsSettings();
	const totpOn = totpAllowed(sec), totpRequired = totpRequiredFor(sec, account.admin);
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.accountTitle}</h1></div><p class="lead">${s.accountLead}</p><div class="panel"><h3>${s.identity} <span class="ro">${s.readonly}</span></h3>${account.name && renderTemplate`<div class="kv"><span class="k">${s.userName}</span><span class="v">${account.name}</span></div>`}<div class="kv"><span class="k">${s.userLogin}</span><span class="v">${account.email}</span></div><div class="kv"><span class="k">${s.boxesWord}</span><span class="v">${account.boitiers} / ${account.cap}</span></div></div>${totpOn && renderTemplate`<div class="panel" id="totpPanel" style="margin-top:.9rem"><h3>${s.totpTitle}</h3>${totpRequired && !account.totpEnabled && renderTemplate`<p class="formerr" style="margin:0 0 .5rem">${s.totpRequiredNotice}</p>`}${account.totpEnabled ? renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p class="note">✓ ${s.totpOnNote}</p>${!totpRequired && renderTemplate`<div class="row" style="margin-top:.5rem"><input class="code-in" id="totpOffCode" type="text" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code"><button class="btn ghost sm" type="button" id="totpDisableBtn">${s.totpDisable}</button></div>`}` })}` : renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p class="note">${s.totpIntro}</p><button class="btn primary" type="button" id="totpStartBtn" style="margin-top:.5rem">${s.totpEnable}</button><div id="totpEnroll" hidden style="margin-top:.7rem"><div class="qr" id="totpQr"></div><p class="note">${s.totpManual} <code id="totpSecret"></code></p><div class="row" style="margin-top:.5rem"><input class="code-in" id="totpCode" type="text" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code"><button class="btn primary sm" type="button" id="totpConfirmBtn">${s.totpConfirm}</button></div></div>` })}`}<p class="formerr" id="totpErr" hidden></p></div>`}<div class="card" style="margin-top:.9rem"><div class="add"><div><div style="font-weight:550">${s.logoutTitle}</div><p class="note" style="margin:.15rem 0 0">${s.logoutNote}</p></div><button class="btn ghost" type="button" id="logoutBtn">${s.logoutBtn}</button></div></div><script>(function(){${defineScriptVars({ home: ROUTES.appareils[lang] })}
  (function () {
    var b = document.getElementById('logoutBtn');
    if (b) b.addEventListener('click', function () {
      fetch('/api/logout', { method: 'POST' }).then(function () { location.href = home; }).catch(function () { location.href = home; });
    });
  })();
  (function () {
    var err = document.getElementById('totpErr');
    var fail = function (m) { if (err) { err.hidden = false; err.textContent = m; } };
    var post = function (url, body) { return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }); };
    var start = document.getElementById('totpStartBtn');
    if (start) start.addEventListener('click', function () {
      start.disabled = true;
      post('/api/account/totp/start').then(function (res) {
        if (!res.ok) { fail(res.d.error || 'échec'); start.disabled = false; return; }
        document.getElementById('totpQr').innerHTML = res.d.svg;   // SVG fabrique par notre serveur
        document.getElementById('totpSecret').textContent = res.d.secret.replace(/(.{4})/g, '$1 ').trim();
        document.getElementById('totpEnroll').hidden = false; start.hidden = true;
      }).catch(function () { fail('erreur réseau'); start.disabled = false; });
    });
    var confirmBtn = document.getElementById('totpConfirmBtn');
    if (confirmBtn) confirmBtn.addEventListener('click', function () {
      post('/api/account/totp/confirm', { code: document.getElementById('totpCode').value }).then(function (res) {
        if (res.ok) location.reload(); else fail(res.d.error || 'échec');
      }).catch(function () { fail('erreur réseau'); });
    });
    var off = document.getElementById('totpDisableBtn');
    if (off) off.addEventListener('click', function () {
      post('/api/account/totp/disable', { code: document.getElementById('totpOffCode').value }).then(function (res) {
        if (res.ok) location.reload(); else fail(res.d.error || 'échec');
      }).catch(function () { fail('erreur réseau'); });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/CompteView.astro", void 0);
export { $$CompteView as t };
