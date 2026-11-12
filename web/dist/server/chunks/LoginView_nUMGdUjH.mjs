import { A as maybeRenderHead, C as renderComponent, F as unescapeHTML, N as addAttribute, k as renderTemplate, w as Fragment } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { l as t, n as ROUTES } from "./i18n_CIzekdEZ.mjs";
import { n as portalNameIsCustom, t as portalName } from "./portal_DsrEHO8S.mjs";
import { r as LOGIN_STEP, t as LOGIN_ERROR } from "./login_CzMTT3CN.mjs";
// src/components/views/LoginView.astro
createAstro("https://astro.build");
var $$LoginView = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$LoginView;
	const { lang, error = null, none = false, step = null, captcha = null, forgot = false, info = false } = Astro.props;
	const s = t(lang);
	const ERR = {
		[LOGIN_ERROR.bad]: s.signInError,
		[LOGIN_ERROR.captcha]: s.loginCaptchaError,
		[LOGIN_ERROR.locked]: s.loginLocked,
		[LOGIN_ERROR.totp]: s.loginTotpError,
		[LOGIN_ERROR.expired]: s.loginExpired
	};
	return renderTemplate`${maybeRenderHead($$result)}<div class="login">${portalNameIsCustom() ? renderTemplate`<span class="login-mark">${portalName()}</span>` : renderTemplate`<span class="login-mark">isno<span class="tld">.fr</span></span>`}${none ? renderTemplate`<div class="login-box"><p class="note">${s.noLoginMethod}</p></div>` : step === LOGIN_STEP.totp ? renderTemplate`<form class="login-box" method="post" action="/api/login/totp"><h1>${s.signInTitle}</h1><input type="hidden" name="lang"${addAttribute(lang, "value")}>${error && renderTemplate`<p class="err" role="alert">${ERR[error]}</p>`}<p class="note">${s.loginTotpPrompt}</p><label for="c">${s.totpCodeLabel}</label><input id="c" class="code" name="code" type="text" inputmode="numeric" pattern="[0-9 ]{6,7}" maxlength="7" autocomplete="one-time-code" autofocus required><button type="submit">${s.signInBtn}</button></form>` : renderTemplate`<form class="login-box" method="post" action="/api/login"><h1>${s.signInTitle}</h1><input type="hidden" name="lang"${addAttribute(lang, "value")}>${info && !error && renderTemplate`<p class="ok" role="status">${s.passwordSetOk}</p>`}${error && renderTemplate`<p class="err" role="alert">${ERR[error]}</p>`}<label for="u">${s.signInUser}</label><input id="u" name="user" type="email" autocomplete="username" autofocus required><label for="p">${s.signInPass}</label><input id="p" name="pass" type="password" autocomplete="current-password" required>${captcha && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<label for="cap">${s.loginCaptchaLabel}</label><div class="login-captcha">${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`${unescapeHTML(captcha.svg)}` })}<input id="cap" class="code" name="captcha" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5" required></div><input type="hidden" name="captcha_token"${addAttribute(captcha.token, "value")}>` })}`}<button type="submit">${s.signInBtn}</button>${forgot && renderTemplate`<a class="login-link"${addAttribute(ROUTES.oubli[lang], "href")}>${s.forgotLink}</a>`}</form>`}</div>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/LoginView.astro", void 0);
export { $$LoginView as t };
