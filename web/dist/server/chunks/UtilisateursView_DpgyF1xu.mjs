import { A as maybeRenderHead, C as renderComponent, N as addAttribute, P as defineScriptVars, k as renderTemplate, w as Fragment } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { g as listAccounts, u as countDevices } from "./boot_CuD6Xa_G.mjs";
import { l as t } from "./i18n_CIzekdEZ.mjs";
import { r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { n as mailEnabled } from "./mail_DXXml3Fw.mjs";
// src/components/views/UtilisateursView.astro
createAstro("https://astro.build");
var $$UtilisateursView = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$UtilisateursView;
	const { lang, accountId } = Astro.props;
	const s = t(lang);
	const accounts = await listAccounts();
	const operators = accounts.filter((a) => a.admin).length;
	const minPass = localAccountsSettings().passwordMinLength;
	const canInvite = mailEnabled();
	const now = Date.now();
	const counts = /* @__PURE__ */ new Map();
	for (const a of accounts) counts.set(a.id, await countDevices(a.id));
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.usersTitle}</h1></div><p class="lead">${s.usersLead}</p><form class="panel" id="userForm" style="margin-bottom:1rem"><h3>${s.userNewTitle}</h3><div class="form-grid"><div class="field"><label for="u-email">${s.userLogin}</label><input id="u-email" name="email" type="email" autocomplete="off" spellcheck="false" required></div><div class="field"><label for="u-name">${s.userName}</label><input id="u-name" name="name" type="text" autocomplete="off" maxlength="80" required></div><div class="field"><label for="u-pass">${s.userPassword}</label><input id="u-pass" name="password" type="password" autocomplete="new-password"${addAttribute(minPass, "minlength")}${addAttribute(!canInvite, "required")}>${canInvite && renderTemplate`<span class="hint">${s.userPassInviteHint}</span>`}</div><div class="field"><label for="u-cap">${s.userCap}</label><input id="u-cap" name="cap" type="number" min="1" value="5" required></div></div><label class="check"><input type="checkbox" id="u-admin" name="admin"> ${s.userMakeAdmin}</label><div class="row end" style="margin-top:.7rem"><button class="btn primary" type="submit">${s.createUserBtn}</button></div><p class="formerr" id="userErr" hidden></p></form><div class="panel"><h3>${s.usersListTitle}</h3><div class="utable"><div class="ut-head"><span>${s.colLogin}</span><span>${s.colRole}</span><span>${s.colCap}</span><span>${s.colDevices}</span><span></span></div>${accounts.map((a) => renderTemplate`<div class="ut-row"><span class="who"><b>${a.name ?? a.id}</b>${a.id === accountId && renderTemplate`<span class="youtag">${s.youTag}</span>`}<span class="mono">${a.id}</span></span><span class="tags"><span${addAttribute(["role", { op: a.admin }], "class:list")}>${a.admin ? s.roleAdmin : s.roleUser}</span>${a.totpEnabled && renderTemplate`<span class="role">2FA</span>`}${a.lockedUntil && a.lockedUntil > now && renderTemplate`<span class="role locked">${s.lockedTag}</span>`}${!a.passHash && renderTemplate`<span class="role pending">${s.invitedTag}</span>`}</span><span class="num"${addAttribute(s.colCap, "data-label")}>${a.deviceCap}</span><span class="num"${addAttribute(s.colDevices, "data-label")}>${counts.get(a.id) ?? 0}</span><span class="ut-act">${!a.passHash && canInvite && renderTemplate`<button class="btn ghost sm" type="button"${addAttribute(a.id, "data-invite")}>${s.resendInviteBtn}</button>`}${a.lockedUntil && a.lockedUntil > now && renderTemplate`<button class="btn ghost sm" type="button"${addAttribute(a.id, "data-unlock")}>${s.unlockBtn}</button>`}${a.totpEnabled && a.id !== accountId && renderTemplate`<button class="btn ghost sm" type="button"${addAttribute(a.id, "data-totp-reset")}>${s.totpResetBtn}</button>`}${a.id !== accountId && !(a.admin && operators <= 1) && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<button class="btn ghost sm" type="button"${addAttribute(a.id, "data-role")}${addAttribute(a.admin ? "false" : "true", "data-admin")}>${a.admin ? s.unmakeOperator : s.makeOperator}</button><button class="btn danger sm" type="button"${addAttribute(a.id, "data-del")}>${s.removeUser}</button>` })}`}</span></div>`)}</div></div><script>(function(){${defineScriptVars({
		createErr: s.createUserError,
		removeErr: s.removeUserError,
		roleErr: s.roleError,
		confirmTpl: s.confirmRemoveUser("__ID__")
	})}
  (function () {
    var form = document.getElementById('userForm');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = document.getElementById('userErr'); err.hidden = true;
      var payload = {
        email: document.getElementById('u-email').value.trim(),
        name: document.getElementById('u-name').value.trim(),
        password: document.getElementById('u-pass').value,
        cap: parseInt(document.getElementById('u-cap').value, 10) || 5,
        admin: document.getElementById('u-admin').checked,
        lang: document.documentElement.lang,
      };
      fetch('/api/user/new', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { if (r.ok) { location.reload(); return; } return r.json().then(function (d) { err.hidden = false; err.textContent = (d && d.error) || createErr; if (r.status === 502) setTimeout(function () { location.reload(); }, 2500); }); })
        .catch(function () { err.hidden = false; err.textContent = createErr; });
    });
    [['data-unlock', '/api/user/unlock'], ['data-totp-reset', '/api/user/totp-reset'], ['data-invite', '/api/user/invite-resend']].forEach(function (pair) {
      document.querySelectorAll('[' + pair[0] + ']').forEach(function (b) {
        b.addEventListener('click', function () {
          b.disabled = true;
          fetch(pair[1], { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: b.getAttribute(pair[0]), lang: document.documentElement.lang }) })
            .then(function (r) { if (r.ok) location.reload(); else { alert(roleErr); b.disabled = false; } })
            .catch(function () { alert(roleErr); b.disabled = false; });
        });
      });
    });
    document.querySelectorAll('[data-role]').forEach(function (b) {
      b.addEventListener('click', function () {
        b.disabled = true;
        fetch('/api/user/role', { method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: b.getAttribute('data-role'), admin: b.getAttribute('data-admin') === 'true' }) })
          .then(function (r) { if (r.ok) location.reload(); else { alert(roleErr); b.disabled = false; } })
          .catch(function () { alert(roleErr); b.disabled = false; });
      });
    });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var id = b.getAttribute('data-del');
        if (!confirm(confirmTpl.replace('__ID__', id))) return;
        fetch('/api/user/delete', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: id }) })
          .then(function (r) { if (r.ok) location.reload(); else alert(removeErr); })
          .catch(function () { alert(removeErr); });
      });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/UtilisateursView.astro", void 0);
export { $$UtilisateursView as t };
