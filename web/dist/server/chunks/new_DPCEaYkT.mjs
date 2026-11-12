import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { d as createAccount, m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { u as hashPass } from "./config_2VUiG471.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { n as normalizeName, t as normalizeEmail } from "./validate_DM5ZsbnO.mjs";
import { r as localAccountsSettings } from "./local-accounts-settings_vLu63073.mjs";
import { n as mailEnabled } from "./mail_DXXml3Fw.mjs";
import { t as sendInvitation } from "./mailer__27al7tC.mjs";
import { t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/api/user/new.ts
var new_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const me = await requireUserAdmin(request);
	if (!me) return json(403, { error: "forbidden" });
	const b = await readBody(request);
	const login = normalizeEmail(b.email), name = normalizeName(b.name);
	const password = String(b.password ?? "");
	const cap = Number(b.cap ?? 5);
	if (!login) return json(400, { error: "e-mail invalide" });
	if (!name) return json(400, { error: "nom requis" });
	const invite = password === "";
	if (invite && !mailEnabled()) return json(400, { error: "mot de passe requis (messagerie non configurée)" });
	const min = localAccountsSettings().passwordMinLength;
	if (!invite && password.length < min) return json(400, { error: `mot de passe trop court (${min} caractères minimum)` });
	if (!Number.isInteger(cap) || cap < 1) return json(400, { error: "plafond invalide" });
	if (await getAccount(login)) return json(409, { error: "e-mail déjà utilisé" });
	await createAccount(login, name, invite ? null : hashPass(password), cap, b.admin === true);
	if (!invite) return json(200, { ok: true });
	const r = await sendInvitation(b.lang === LANG.en ? LANG.en : LANG.fr, {
		id: login,
		name,
		passHash: null
	}, (await getAccount(me))?.name ?? null);
	return r.ok ? json(200, {
		ok: true,
		invited: true
	}) : json(502, { error: `compte créé, invitation non envoyée : ${r.error}` });
};
// \0virtual:astro:page:src/pages/api/user/new@_@ts
var page = () => new_exports;
export { page };
