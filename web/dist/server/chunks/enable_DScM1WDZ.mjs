import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { o as loadConfig, s as saveConfig } from "./config_2VUiG471.mjs";
import { a as requireAdmin, c as BUILTIN_PLUGINS, d as enabledPlugins, l as PLUGINS_DIR, u as PLUGIN_ID_RE } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { t as restartSoon } from "./restart_DVsw9_UO.mjs";
import { existsSync } from "node:fs";
import { join } from "node:path";
// src/pages/api/plugins/enable.ts
var enable_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const cfg = loadConfig();
	if (!cfg) return json(409, { error: "instance non configurée" });
	const id = String((await readBody(request)).id ?? "");
	if (!PLUGIN_ID_RE.test(id)) return json(400, { error: "identifiant invalide" });
	if (!BUILTIN_PLUGINS[id] && !existsSync(join(PLUGINS_DIR, id, "index.js"))) return json(404, { error: "plugin non installé" });
	const list = enabledPlugins();
	if (!list.includes(id)) saveConfig({
		...cfg,
		plugins: [...list, id]
	});
	restartSoon();
	return json(200, {
		ok: true,
		restarting: true
	});
};
// \0virtual:astro:page:src/pages/api/plugins/enable@_@ts
var page = () => enable_exports;
export { page };
