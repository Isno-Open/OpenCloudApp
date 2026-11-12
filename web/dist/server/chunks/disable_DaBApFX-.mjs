import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { o as loadConfig, s as saveConfig } from "./config_2VUiG471.mjs";
import { a as requireAdmin, c as BUILTIN_PLUGINS, d as enabledPlugins } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { s as removeCatalogPlugin } from "./supervisor_DmaMSdpl.mjs";
import { t as restartSoon } from "./restart_DVsw9_UO.mjs";
// src/pages/api/plugins/disable.ts
var disable_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const cfg = loadConfig();
	if (!cfg) return json(409, { error: "instance non configurée" });
	const id = String((await readBody(request)).id ?? "");
	if (!enabledPlugins().includes(id)) return json(404, { error: "plugin non actif" });
	saveConfig({
		...cfg,
		plugins: enabledPlugins().filter((p) => p !== id)
	});
	if (!BUILTIN_PLUGINS[id]) {
		const r = await removeCatalogPlugin(id);
		if (!r.ok) console.error(`[plugins] retrait du code de ${id} :`, r.error);
	}
	restartSoon();
	return json(200, {
		ok: true,
		restarting: true
	});
};
// \0virtual:astro:page:src/pages/api/plugins/disable@_@ts
var page = () => disable_exports;
export { page };
