import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { T as setAccountAdmin, g as listAccounts, m as getAccount } from "./boot_CuD6Xa_G.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/user/role.ts
var role_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const me = await requireUserAdmin(request);
	if (!me) return json(403, { error: "forbidden" });
	const b = await readBody(request);
	const id = String(b.id ?? "");
	if (!id || id === me) return json(400, { error: "changement refusé" });
	if ((await getAccount(id))?.admin && (await listAccounts()).filter((a) => a.admin).length <= 1) return json(400, { error: "dernier opérateur : refusé" });
	if (!await getAccount(id)) return json(404, { error: "compte inconnu" });
	await setAccountAdmin(id, b.admin === true);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/user/role@_@ts
var page = () => role_exports;
export { page };
