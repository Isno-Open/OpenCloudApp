import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured, c as setupWindowOpen, n as DB_MODULE, t as DB_KIND } from "./config_2VUiG471.mjs";
import { r as getModule } from "./supervisor_DmaMSdpl.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/test-db.ts
var test_db_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (isConfigured()) return json(409, { error: "instance déjà configurée" });
	if (!setupWindowOpen()) return json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" });
	const b = await readBody(request);
	const kind = String(b.kind ?? "");
	if (kind === DB_KIND.sqlite) return json(200, { ok: true });
	let url = String(b.mongoUrl ?? "").trim();
	if (kind === DB_KIND.mongoBundled) {
		const r = await getModule(DB_MODULE[DB_KIND.mongoBundled]);
		if (!r.ok) return json(200, {
			ok: false,
			error: r.error
		});
		if (!r.module.ready || !r.module.endpoint) return json(200, {
			ok: false,
			error: "MongoDB pas encore installé"
		});
		url = r.module.endpoint;
	}
	if (!url) return json(400, {
		ok: false,
		error: "URL Mongo requise"
	});
	try {
		const { MongoClient } = await import("mongodb");
		const c = new MongoClient(url, { serverSelectionTimeoutMS: 3e3 });
		await c.connect();
		await c.db().command({ ping: 1 });
		await c.close();
		return json(200, { ok: true });
	} catch (e) {
		return json(200, {
			ok: false,
			error: e instanceof Error ? e.message : "connexion impossible"
		});
	}
};
// \0virtual:astro:page:src/pages/api/setup/test-db@_@ts
var page = () => test_db_exports;
export { page };
