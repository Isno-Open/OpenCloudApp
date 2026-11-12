import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured, c as setupWindowOpen } from "./config_2VUiG471.mjs";
import { i as checkHosts, o as requestScheme } from "./hosts__VU0BI7P.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/check-hosts.ts
var check_hosts_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (isConfigured()) return json(409, { error: "instance déjà configurée" });
	if (!setupWindowOpen()) return json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" });
	const b = await readBody(request);
	return json(200, await checkHosts(String(b.appHost ?? ""), String(b.brokerHost ?? ""), requestScheme(request)));
};
// \0virtual:astro:page:src/pages/api/setup/check-hosts@_@ts
var page = () => check_hosts_exports;
export { page };
