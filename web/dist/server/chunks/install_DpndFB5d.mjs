import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { i as installCatalogPlugin, o as listCatalogPlugins } from "./supervisor_DmaMSdpl.mjs";
import { o as loadConfig } from "./config_2VUiG471.mjs";
// src/pages/api/plugins/install.ts
var install_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	await listCatalogPlugins(loadConfig()?.pluginSources ?? []);
	const r = await installCatalogPlugin(String((await readBody(request)).id ?? ""));
	return r.ok ? json(200, r.data) : json(502, { error: r.error });
};
// \0virtual:astro:page:src/pages/api/plugins/install@_@ts
var page = () => install_exports;
export { page };
