import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { t as sendInvitation } from "./mailer__27al7tC.mjs";
import { t as LANG } from "./i18n_CIzekdEZ.mjs";
// src/pages/api/user/invite-resend.ts
var invite_resend_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const me = await requireUserAdmin(request);
	if (!me) return json(403, { error: "forbidden" });
	const b = await readBody(request);
	const a = await getAccount(String(b.id ?? ""));
	if (!a) return json(404, { error: "compte inconnu" });
	if (a.passHash) return json(409, { error: "mot de passe déjà choisi" });
	const inviter = (await getAccount(me))?.name ?? null;
	const r = await sendInvitation(b.lang === LANG.en ? LANG.en : LANG.fr, a, inviter);
	return r.ok ? json(200, { ok: true }) : json(502, { error: r.error });
};
// \0virtual:astro:page:src/pages/api/user/invite-resend@_@ts
var page = () => invite_resend_exports;
export { page };
