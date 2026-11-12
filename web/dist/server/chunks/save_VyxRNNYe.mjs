import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured, c as setupWindowOpen, n as DB_MODULE, s as saveConfig, t as DB_KIND, u as hashPass } from "./config_2VUiG471.mjs";
import { n as PLUGIN_ID } from "./local-accounts-settings_vLu63073.mjs";
import { r as getModule } from "./supervisor_DmaMSdpl.mjs";
import { n as normalizeName, t as normalizeEmail } from "./validate_DM5ZsbnO.mjs";
import { a as normalizeHost, i as checkHosts, o as requestScheme, t as BROKER_PUBLIC_PORT } from "./hosts__VU0BI7P.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/save.ts
var save_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var KINDS = [
	DB_KIND.sqlite,
	DB_KIND.mongoBundled,
	DB_KIND.mongoExternal
];
var POST = async ({ request }) => {
	if (isConfigured()) return json(409, { error: "instance déjà configurée" });
	if (!setupWindowOpen()) return json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" });
	const b = await readBody(request);
	const kind = String(b.kind ?? "");
	if (!KINDS.includes(kind)) return json(400, { error: "base de données inconnue" });
	const adminEmail = normalizeEmail(b.adminEmail), adminName = normalizeName(b.adminName);
	const adminPassword = String(b.adminPassword ?? "");
	if (!adminEmail) return json(400, { error: "e-mail de l'opérateur invalide" });
	if (!adminName) return json(400, { error: "nom de l'opérateur requis" });
	if (adminPassword.length < 8) return json(400, { error: "mot de passe trop court (8 caractères minimum)" });
	const scheme = requestScheme(request);
	const hosts = await checkHosts(String(b.appHost ?? ""), String(b.brokerHost ?? ""), scheme);
	if (!hosts.ok) return json(400, {
		error: "noms d'hôte non vérifiés",
		checks: hosts.checks
	});
	const publicAppUrl = `${scheme}://${normalizeHost(String(b.appHost))}`;
	const brokerPublicUrl = `mqtts://${normalizeHost(String(b.brokerHost)).replace(/:\d+$/, "")}:${BROKER_PUBLIC_PORT}`;
	let db;
	if (kind === DB_KIND.mongoExternal) {
		const mongoUrl = String(b.mongoUrl ?? "").trim();
		if (!mongoUrl) return json(400, { error: "URL Mongo requise" });
		db = {
			kind,
			mongoUrl
		};
	} else if (kind === DB_KIND.mongoBundled) {
		const r = await getModule(DB_MODULE[DB_KIND.mongoBundled]);
		if (!r.ok) return json(502, { error: r.error });
		if (!r.module.ready || !r.module.endpoint) return json(409, { error: "MongoDB n'est pas encore installé" });
		db = {
			kind,
			mongoUrl: r.module.endpoint
		};
	} else db = { kind };
	const plugins = b.userAdmin === false ? [] : [PLUGIN_ID];
	const cfg = {
		configured: true,
		db,
		publicAppUrl,
		brokerPublicUrl,
		plugins,
		operator: {
			email: adminEmail,
			name: adminName,
			passHash: hashPass(adminPassword)
		}
	};
	saveConfig(cfg);
	setTimeout(() => process.exit(0), 400);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/setup/save@_@ts
var page = () => save_exports;
export { page };
