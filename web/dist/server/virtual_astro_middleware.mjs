import { a as isConfigured, l as setupWindowRemaining, r as SETUP_WINDOW_S } from "./chunks/config_2VUiG471.mjs";
import { bt as defineMiddleware, t as sequence } from "./chunks/sequence_PGj_G6K4.mjs";
import { m as getAccount } from "./chunks/boot_CuD6Xa_G.mjs";
import { a as totpRequiredFor, r as localAccountsSettings } from "./chunks/local-accounts-settings_vLu63073.mjs";
import { s as resolveAccountId } from "./chunks/auth_Da2rUxTp.mjs";
import { n as ROUTES } from "./chunks/i18n_CIzekdEZ.mjs";
// src/middleware.ts
var TOTP_FREE = /* @__PURE__ */ new Set([...Object.values(ROUTES.compte), ...Object.values(ROUTES.connexion)]);
var announced = false;
var onRequest$1 = defineMiddleware(async (context, next) => {
	const p = new URL(context.request.url).pathname;
	const bypass = p === "/setup" || p.startsWith("/api/setup") || p.startsWith("/_") || p.includes(".");
	if (!isConfigured()) {
		if (!announced) {
			announced = true;
			const left = setupWindowRemaining();
			console.log(left > 0 ? `[setup] installation ouverte sur /setup pendant encore ${left} s (fenetre de ${SETUP_WINDOW_S} s apres le demarrage).` : "[setup] fenetre d'installation expiree : redemarrer le serveur pour la rouvrir.");
		}
		if (!bypass) return context.redirect("/setup");
		return next();
	}
	if (!bypass && !p.startsWith("/api/") && !TOTP_FREE.has(p)) {
		const id = await resolveAccountId(context.request);
		const a = id ? await getAccount(id) : null;
		if (a && !a.totpEnabled && totpRequiredFor(localAccountsSettings(), a.admin)) return context.redirect(`${p.startsWith("/en") ? ROUTES.compte.en : ROUTES.compte.fr}?totp=required`);
	}
	return next();
});
// \0virtual:astro:middleware
var onRequest = sequence(onRequest$1);
export { onRequest };
