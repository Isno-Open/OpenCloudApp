import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured, c as setupWindowOpen } from "./config_2VUiG471.mjs";
import { a as ensureCA, o as ensureRelayCert } from "./pki_DfnIFSmA.mjs";
import { a as normalizeHost } from "./hosts__VU0BI7P.mjs";
import { n as prepareBroker } from "./broker_BEK5ykmn.mjs";
import { r as getModule, t as BROKER_MODULE } from "./supervisor_DmaMSdpl.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { lookup } from "node:dns/promises";
// src/pages/api/setup/broker.ts
var broker_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var guard = () => isConfigured() ? json(409, { error: "instance déjà configurée" }) : !setupWindowOpen() ? json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" }) : null;
var GET = async () => {
	const g = guard();
	if (g) return g;
	const r = await getModule(BROKER_MODULE);
	return r.ok ? json(200, r.module) : json(502, { error: r.error });
};
var POST = async ({ request }) => {
	const g = guard();
	if (g) return g;
	const host = normalizeHost(String((await readBody(request)).brokerHost ?? ""))?.replace(/:\d+$/, "") ?? null;
	if (!host) return json(400, { error: "nom d'hôte du broker invalide" });
	try {
		await lookup(host.replace(/:\d+$/, ""));
	} catch {
		return json(400, { error: `« ${host} » ne se résout pas (DNS) : créez d'abord l'enregistrement` });
	}
	ensureCA();
	ensureRelayCert();
	const r = await prepareBroker(host);
	return r.ok ? json(200, r.module) : json(502, { error: r.error });
};
// \0virtual:astro:page:src/pages/api/setup/broker@_@ts
var page = () => broker_exports;
export { page };
