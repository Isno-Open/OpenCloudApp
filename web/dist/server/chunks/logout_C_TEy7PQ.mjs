import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { g as logoutCookies, i as plugins } from "./auth_Da2rUxTp.mjs";
// src/pages/api/logout.ts
var logout_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async () => {
	await plugins();
	const headers = new Headers({ "content-type": "application/json" });
	for (const c of logoutCookies()) headers.append("Set-Cookie", c);
	return new Response(JSON.stringify({ ok: true }), {
		status: 200,
		headers
	});
};
// \0virtual:astro:page:src/pages/api/logout@_@ts
var page = () => logout_exports;
export { page };
