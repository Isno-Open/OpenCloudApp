import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { o as loadConfig, s as saveConfig } from "./config_2VUiG471.mjs";
import { a as smtpConfig, r as normalizeSmtp } from "./mail_DXXml3Fw.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/settings/general.ts
var general_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const cfg = loadConfig();
	if (!cfg) return json(409, { error: "instance non configurée" });
	const b = await readBody(request);
	let next = cfg;
	if ("appName" in b) {
		const appName = String(b.appName ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
		const { appName: _old, ...rest } = next;
		next = appName ? {
			...rest,
			appName
		} : rest;
	}
	if ("smtp" in b) {
		const raw = b.smtp && typeof b.smtp === "object" ? b.smtp : {};
		const { smtp: _old, ...rest } = next;
		if (String(raw.host ?? "").trim() === "") next = rest;
		else {
			const smtp = normalizeSmtp({
				...raw,
				pass: String(raw.pass ?? "") || smtpConfig()?.pass || ""
			});
			if (!smtp) return json(400, { error: "messagerie : serveur, port et adresse d’expédition requis" });
			next = {
				...rest,
				smtp
			};
		}
	}
	saveConfig(next);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/settings/general@_@ts
var page = () => general_exports;
export { page };
