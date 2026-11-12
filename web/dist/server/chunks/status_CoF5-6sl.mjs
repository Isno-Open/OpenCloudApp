import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as requireAdmin } from "./auth_Da2rUxTp.mjs";
import { t as json } from "./http_GIg9YBvo.mjs";
import { n as catalogPlugin } from "./supervisor_DmaMSdpl.mjs";
// src/pages/api/plugins/status.ts
var status_exports = /* @__PURE__ */ __exportAll({ GET: () => GET });
var GET = async ({ request, url }) => {
	if (!await requireAdmin(request)) return json(403, { error: "forbidden" });
	const r = await catalogPlugin(url.searchParams.get("id") ?? "");
	return r.ok ? json(200, r.data) : json(502, { error: r.error });
};
// \0virtual:astro:page:src/pages/api/plugins/status@_@ts
var page = () => status_exports;
export { page };
