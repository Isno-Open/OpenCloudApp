import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renderComponent, k as renderTemplate } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$CloudLayout } from "./CloudLayout_DwJel01H.mjs";
import { t as $$LierView } from "./LierView_C3EC7zrF.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { h as getDeviceAuthByUserCode } from "./boot_CuD6Xa_G.mjs";
import { t as DEVICE_AUTH_STATE } from "./types_C9jyr2h_.mjs";
import { a as normalizeUserCode, n as displayUserCode } from "./device-code_COVWacCR.mjs";
import { l as t, n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { r as LINK_VIEW, t as LINK_COOKIE } from "./link_CcbVL7PN.mjs";
// src/pages/en/link.astro
var link_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Link,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Link = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Link;
	const lang = LANG.en;
	const raw = Astro.url.searchParams.get("code") ?? Astro.cookies.get("link_code")?.value ?? "";
	if (!await resolveAccountId(Astro.request)) {
		const n = normalizeUserCode(raw);
		if (n) Astro.cookies.set(LINK_COOKIE, n, {
			path: "/",
			httpOnly: true,
			sameSite: "lax",
			maxAge: 600,
			secure: Astro.url.protocol === "https:"
		});
		return Astro.redirect(ROUTES.connexion[lang]);
	}
	Astro.cookies.delete(LINK_COOKIE, { path: "/" });
	let view = LINK_VIEW.enter;
	let code = "";
	let deviceId = "";
	if (raw) {
		const n = normalizeUserCode(raw);
		const rec = n ? await getDeviceAuthByUserCode(n) : null;
		if (n && rec && rec.state === DEVICE_AUTH_STATE.pending && rec.expiresAt > Date.now()) {
			view = LINK_VIEW.confirm;
			code = displayUserCode(n);
			deviceId = rec.deviceId;
		} else {
			view = LINK_VIEW.invalid;
			code = raw.slice(0, 12);
		}
	}
	return renderTemplate`${renderComponent($$result, "CloudLayout", $$CloudLayout, {
		"title": `${t(lang).linkTitle}`,
		"lang": lang,
		"altUrl": ROUTES.lier[LANG.fr]
	}, { "default": ($$result) => renderTemplate`${renderComponent($$result, "LierView", $$LierView, {
		"lang": lang,
		"view": view,
		"code": code,
		"deviceId": deviceId
	})}` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/en/link.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/en/link.astro";
var $$url = "/en/link";
// \0virtual:astro:page:src/pages/en/link@_@astro
var page = () => link_exports;
export { page };
