import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { C as renameDevice, p as findDevice } from "./boot_CuD6Xa_G.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/boitier/rename.ts
var rename_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const acc = await resolveAccountId(request);
	if (!acc) return json(401, { error: "auth" });
	const b = await readBody(request);
	const deviceId = String(b.device_id ?? ""), name = String(b.name ?? "").trim();
	if (!name) return json(400, { error: "nom vide" });
	if (!await findDevice(deviceId, acc)) return json(403, { error: "device non possédé" });
	await renameDevice(deviceId, acc, name);
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/boitier/rename@_@ts
var page = () => rename_exports;
export { page };
