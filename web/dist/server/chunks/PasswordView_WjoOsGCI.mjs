import { A as maybeRenderHead, N as addAttribute, P as defineScriptVars, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
import { n as portalNameIsCustom, t as portalName } from "./portal_DsrEHO8S.mjs";
// src/components/views/PasswordView.astro
createAstro("https://astro.build");
var $$PasswordView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$PasswordView;
	const { lang, mode, token = "", valid = false, minLength = 8 } = Astro.props;
	const s = t(lang);
	return renderTemplate`${maybeRenderHead($$result)}<div class="login">${portalNameIsCustom() ? renderTemplate`<span class="login-mark">${portalName()}</span>` : renderTemplate`<span class="login-mark">isno<span class="tld">.fr</span></span>`}${mode === "forgot" ? renderTemplate`<form class="login-box" id="pwForm" data-mode="forgot"><h1>${s.forgotTitle}</h1><p class="note">${s.forgotIntro}</p><label for="em">${s.signInUser}</label><input id="em" type="email" autocomplete="username" autofocus required><p class="note" id="pwDone" hidden>${s.forgotSent}</p><button type="submit">${s.forgotBtn}</button><a class="login-link"${addAttribute(`${ROUTES.connexion[lang]}?local=1`, "href")}>${s.backToLogin}</a></form>` : valid ? renderTemplate`<form class="login-box" id="pwForm" data-mode="set"><h1>${s.setPasswordTitle}</h1><label for="pw">${s.newPassword}</label><input id="pw" type="password" autocomplete="new-password"${addAttribute(minLength, "minlength")} autofocus required><label for="pw2">${s.confirmPassword}</label><input id="pw2" type="password" autocomplete="new-password"${addAttribute(minLength, "minlength")} required><p class="err" id="pwErr" hidden></p><button type="submit">${s.setPasswordBtn}</button></form>` : renderTemplate`<div class="login-box"><h1>${s.setPasswordTitle}</h1><p class="err">${s.linkExpired}</p><a class="login-link"${addAttribute(ROUTES.oubli[lang], "href")}>${s.askNewLink}</a></div>`}</div><script>(function(){${defineScriptVars({
		lang,
		token,
		loginUrl: `${ROUTES.connexion[lang]}?local=1&ok=password`,
		mismatch: s.passwordMismatch,
		netErr: s.netErr
	})}
  (function () {
    var f = document.getElementById('pwForm'); if (!f) return;
    var post = function (url, body) { return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }); };
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = f.querySelector('button'); btn.disabled = true;
      if (f.getAttribute('data-mode') === 'forgot') {
        post('/api/password/forgot', { email: document.getElementById('em').value.trim(), lang: lang })
          .then(function () { document.getElementById('pwDone').hidden = false; })
          .catch(function () { btn.disabled = false; });
        return;
      }
      var err = document.getElementById('pwErr'); err.hidden = true;
      var a = document.getElementById('pw').value, b = document.getElementById('pw2').value;
      if (a !== b) { err.hidden = false; err.textContent = mismatch; btn.disabled = false; return; }
      post('/api/password/set', { token: token, password: a }).then(function (res) {
        if (res.ok) { location.href = loginUrl; return; }
        err.hidden = false; err.textContent = res.d.error || 'échec'; btn.disabled = false;
      }).catch(function () { err.hidden = false; err.textContent = netErr; btn.disabled = false; });
    });
  })();
})();<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/PasswordView.astro", void 0);
export { $$PasswordView as t };
