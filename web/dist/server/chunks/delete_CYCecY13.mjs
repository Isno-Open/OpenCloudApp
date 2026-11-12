import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { g as listAccounts, m as getAccount, x as removeAccount } from "./boot_CuD6Xa_G.mjs";
import { o as requireUserAdmin } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/user/delete.ts
var delete_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const me = await requireUserAdmin(request);
	if (!me) return json(403, { error: "forbidden" });
	const id = String((await readBody(request)).id ?? "");
	if (!id || id === me) return json(400, { error: "suppression refusée" });
	if ((await getAccount(id))?.admin && (await listAccounts()).filter((a) => a.admin).length <= 1) return json(400, { error: "dernier opérateur : refusé" });
	await removeAccount(id);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/user/delete@_@ts
var page = () => delete_exports;
export { page };
