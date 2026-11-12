import { A as maybeRenderHead, N as addAttribute, P as defineScriptVars, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { o as loadConfig, t as DB_KIND } from "./config_2VUiG471.mjs";
import { a as smtpConfig, t as SMTP_SECURITY } from "./mail_DXXml3Fw.mjs";
import { l as t } from "./i18n_CIzekdEZ.mjs";
// src/components/views/ParametresView.astro
createAstro("https://astro.build");
var $$ParametresView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$ParametresView;
	const { lang } = Astro.props;
	const s = t(lang);
	const cfg = loadConfig();
	const dbLabel = cfg?.db.kind === DB_KIND.mongoExternal ? s.dbMongoExternal : cfg?.db.kind === DB_KIND.mongoBundled ? s.dbMongoBundled : s.dbSqlite;
	const smtp = smtpConfig();
	const appHost = (cfg?.publicAppUrl ?? "").replace(/^[a-z]+:\/\//, "");
	const SEC_LABEL = {
		[SMTP_SECURITY.starttls]: "STARTTLS",
		[SMTP_SECURITY.tls]: "TLS",
		[SMTP_SECURITY.none]: s.smtpSecNone
	};
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.settingsTitle}</h1></div><p class="lead">${s.settingsLead}</p><form class="panel" id="generalForm"><h3>${s.generalTitle}</h3><div class="field"><label for="appName">${s.appNameLabel}</label><input id="appName" type="text" maxlength="60"${addAttribute(cfg?.appName ?? "", "value")} placeholder="ISNO Cloud"><span class="hint">${s.appNameHint}</span></div><h4 class="subhead">${s.smtpTitle} ${!smtp && renderTemplate`<span class="ro">${s.smtpOff}</span>`}</h4><p class="hint" style="margin:0 0 .5rem">${s.smtpIntro}</p><div class="form-grid"><div class="field"><label for="smHost">${s.smtpHost}</label><input id="smHost" type="text" spellcheck="false"${addAttribute(smtp?.host ?? "", "value")} placeholder="smtp.exemple.fr"></div><div class="field"><label for="smPort">${s.smtpPort}</label><input id="smPort" type="number" min="1" max="65535"${addAttribute(smtp?.port ?? 587, "value")}></div><div class="field"><label for="smSec">${s.smtpSecurity}</label><select id="smSec">${Object.values(SMTP_SECURITY).map((v) => renderTemplate`<option${addAttribute(v, "value")}${addAttribute(v === (smtp?.security ?? SMTP_SECURITY.starttls), "selected")}>${SEC_LABEL[v]}</option>`)}</select></div><div class="field"><label for="smUser">${s.smtpUser}</label><input id="smUser" type="text" spellcheck="false" autocomplete="off"${addAttribute(smtp?.user ?? "", "value")}></div><div class="field"><label for="smPass">${s.smtpPass}</label><input id="smPass" type="password" autocomplete="new-password"${addAttribute(smtp?.pass ? s.smtpPassKept : "", "placeholder")}></div><div class="field"><label for="smFrom">${s.smtpFrom}</label><input id="smFrom" type="email" spellcheck="false"${addAttribute(smtp?.fromEmail ?? "", "value")} placeholder="portail@exemple.fr"></div><div class="field"><label for="smFromName">${s.smtpFromName}</label><input id="smFromName" type="text" maxlength="80"${addAttribute(smtp?.fromName ?? "", "value")}${addAttribute(cfg?.appName || "ISNO Cloud", "placeholder")}></div></div><div class="row end" style="margin-top:.6rem"><span class="savemsg" id="generalMsg"></span>${smtp && renderTemplate`<button class="btn ghost" type="button" id="smtpTestBtn">${s.smtpTest}</button>`}<button class="btn primary" type="submit">${s.saveBtn}</button></div></form><form class="panel" id="hostForm" style="margin-top:.9rem"><h3>${s.instanceTitle}</h3><div class="field"><label for="appHost">${s.portalHostLabel}</label><div class="row"><input id="appHost" type="text" spellcheck="false"${addAttribute(appHost, "value")} style="flex:1"><button class="btn ghost" type="submit">${s.portalHostBtn}</button></div><span class="hint">${s.portalHostHint}</span></div><ul class="checks" id="hostChecks" hidden></ul><div class="kv" style="margin-top:.7rem"><span class="k">${s.brokerUrlLabel}</span><span class="v">${cfg?.brokerPublicUrl ?? ""} <span class="ro">${s.readonly}</span></span></div><span class="hint">${s.brokerRoReason}</span><div class="kv" style="margin-top:.5rem"><span class="k">${s.dbKindLabel}</span><span class="v">${dbLabel} <span class="ro">${s.readonly}</span></span></div><span class="hint">${s.dbRoReason}</span></form><script>(function(){${defineScriptVars({
		okMsg: s.savedMsg,
		errMsg: s.saveError,
		testOk: s.smtpTestOk
	})}
  (function () {
    var $ = function (id) { return document.getElementById(id); };
    var m = $('generalMsg'), show = function (ok, text) { m.className = 'savemsg ' + (ok ? 'ok' : 'err'); m.textContent = text; };
    var post = function (url, body) { return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }); };
    $('generalForm').addEventListener('submit', function (e) {
      e.preventDefault(); m.className = 'savemsg'; m.textContent = '…';
      post('/api/settings/general', {
        appName: $('appName').value,
        smtp: { host: $('smHost').value.trim(), port: Number($('smPort').value), security: $('smSec').value, user: $('smUser').value.trim(),
          pass: $('smPass').value, fromEmail: $('smFrom').value.trim(), fromName: $('smFromName').value.trim() },
      }).then(function (res) { show(res.ok, res.ok ? okMsg : (res.d.error || errMsg)); if (res.ok) setTimeout(function () { location.reload(); }, 600); })
        .catch(function () { show(false, errMsg); });
    });
    $('hostForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var list = $('hostChecks'); list.hidden = false; list.innerHTML = '<li>…</li>';
      post('/api/settings/portal-host', { host: $('appHost').value.trim() }).then(function (res) {
        list.innerHTML = '';
        (res.d.checks || []).forEach(function (c) { var li = document.createElement('li'); li.className = c.ok ? 'ok' : 'ko'; li.textContent = (c.ok ? '✓ ' : '✗ ') + c.detail; list.appendChild(li); });
        if (res.ok) { var li = document.createElement('li'); li.className = 'ok'; li.textContent = okMsg; list.appendChild(li); }
        else if (!res.d.checks) { var l2 = document.createElement('li'); l2.className = 'ko'; l2.textContent = res.d.error || errMsg; list.appendChild(l2); }
      }).catch(function () { list.innerHTML = '<li class="ko">' + errMsg + '</li>'; });
    });
    var tb = $('smtpTestBtn');
    if (tb) tb.addEventListener('click', function () {
      tb.disabled = true; m.className = 'savemsg'; m.textContent = '…';
      post('/api/settings/smtp-test', { lang: document.documentElement.lang })
        .then(function (res) { show(res.ok, res.ok ? testOk + ' ' + res.d.to : (res.d.error || errMsg)); tb.disabled = false; })
        .catch(function () { show(false, errMsg); tb.disabled = false; });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/ParametresView.astro", void 0);
export { $$ParametresView as t };
