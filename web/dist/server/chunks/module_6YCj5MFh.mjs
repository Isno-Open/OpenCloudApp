import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as isConfigured, c as setupWindowOpen, n as DB_MODULE } from "./config_2VUiG471.mjs";
import { a as installModule, r as getModule } from "./supervisor_DmaMSdpl.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/setup/module.ts
var module_exports = /* @__PURE__ */ __exportAll({
	GET: () => GET,
	POST: () => POST
});
var guard = () => isConfigured() ? json(409, { error: "instance déjà configurée" }) : !setupWindowOpen() ? json(403, { error: "fenêtre d'installation expirée : redémarrez le serveur" }) : null;
var moduleFor = (kind) => DB_MODULE[kind] ?? null;
var GET = async ({ url }) => {
	const g = guard();
	if (g) return g;
	const id = moduleFor(url.searchParams.get("kind") ?? "");
	if (!id) return json(400, { error: "aucun module pour ce choix" });
	const r = await getModule(id);
	return r.ok ? json(200, r.module) : json(502, { error: r.error });
};
var POST = async ({ request }) => {
	const g = guard();
	if (g) return g;
	const id = moduleFor(String((await readBody(request)).kind ?? ""));
	if (!id) return json(400, { error: "aucun module pour ce choix" });
	const r = await installModule(id);
	return r.ok ? json(200, r.module) : json(502, { error: r.error });
};
// \0virtual:astro:page:src/pages/api/setup/module@_@ts
var page = () => module_exports;
export { page };
