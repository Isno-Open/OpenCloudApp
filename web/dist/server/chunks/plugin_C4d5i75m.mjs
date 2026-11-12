import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { o as loadConfig, s as saveConfig } from "./config_2VUiG471.mjs";
import { a as requireAdmin, h as pluginSettingsFromForm } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/settings/plugin.ts
var plugin_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const cfg = loadConfig();
	if (!cfg) return json(409, { error: "instance non configurée" });
	const b = await readBody(request);
	const id = String(b.id ?? "");
	const values = b.values && typeof b.values === "object" ? b.values : {};
	const settings = pluginSettingsFromForm(id, values);
	if (settings === null) return json(404, { error: "plugin absent ou sans réglages" });
	saveConfig({
		...cfg,
		pluginSettings: {
			...cfg.pluginSettings ?? {},
			[id]: settings
		}
	});
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/settings/plugin@_@ts
var page = () => plugin_exports;
export { page };
