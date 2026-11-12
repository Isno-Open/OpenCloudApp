import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { m as getAccount, w as resetLoginFailures } from "./boot_CuD6Xa_G.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/user/unlock.ts
var unlock_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	if (!await requireUserAdmin(request)) return json(403, { error: "forbidden" });
	const id = String((await readBody(request)).id ?? "");
	if (!await getAccount(id)) return json(404, { error: "compte inconnu" });
	await resetLoginFailures(id);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/user/unlock@_@ts
var page = () => unlock_exports;
export { page };
