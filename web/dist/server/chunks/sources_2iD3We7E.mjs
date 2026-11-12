import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { o as loadConfig, s as saveConfig } from "./config_2VUiG471.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { o as listCatalogPlugins } from "./supervisor_DmaMSdpl.mjs";
// src/pages/api/plugins/sources.ts
var sources_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var MAX_SOURCES = 20;
var POST = async ({ request }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const cfg = loadConfig();
	if (!cfg) return json(409, { error: "instance non configurée" });
	const b = await readBody(request);
	const current = cfg.pluginSources ?? [];
	let next = current;
	if (typeof b.add === "string") {
		const url = b.add.trim();
		if (current.includes(url)) return json(409, { error: "source déjà ajoutée" });
		if (current.length >= MAX_SOURCES) return json(409, { error: `${MAX_SOURCES} sources au plus` });
		const r = await listCatalogPlugins([url]);
		if (!r.ok) return json(502, { error: r.error });
		const err = r.errors.find((e) => e.source === url && e.unreadable);
		if (err) return json(400, { error: `source illisible : ${err.error}` });
		next = [...current, url];
	} else if (typeof b.remove === "string") next = current.filter((u) => u !== b.remove);
	else return json(400, { error: "add ou remove attendu" });
	const { pluginSources: _old, ...rest } = cfg;
	saveConfig(next.length ? {
		...rest,
		pluginSources: next
	} : rest);
	return json(200, {
		ok: true,
		sources: next
	});
};
// \0virtual:astro:page:src/pages/api/plugins/sources@_@ts
var page = () => sources_exports;
export { page };
