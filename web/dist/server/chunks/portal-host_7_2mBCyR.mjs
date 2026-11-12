import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { o as loadConfig, s as saveConfig } from "./config_2VUiG471.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { o as requestScheme, r as checkAppHost } from "./hosts__VU0BI7P.mjs";
// src/pages/api/settings/portal-host.ts
var portal_host_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const cfg = loadConfig();
	if (!cfg) return json(409, { error: "instance non configurée" });
	const scheme = requestScheme(request);
	const r = await checkAppHost(String((await readBody(request)).host ?? ""), scheme);
	if (!r.ok || !r.host) return json(400, {
		error: "adresse non vérifiée",
		checks: r.checks
	});
	saveConfig({
		...cfg,
		publicAppUrl: `${scheme}://${r.host}`
	});
	return json(200, {
		ok: true,
		publicAppUrl: `${scheme}://${r.host}`,
		checks: r.checks
	});
};
// \0virtual:astro:page:src/pages/api/settings/portal-host@_@ts
var page = () => portal_host_exports;
export { page };
