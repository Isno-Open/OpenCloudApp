import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { p as findDevice, r as publishCmd } from "./boot_CuD6Xa_G.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/cmd.ts
var cmd_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var ACTIONS = {
	UP: "UP",
	STOP: "STOP",
	DOWN: "DOWN"
};
var POST = async ({ request }) => {
	const acc = await resolveAccountId(request);
	if (!acc) return json(401, { error: "auth" });
	const b = await readBody(request);
	const deviceId = String(b.device_id ?? ""), slug = String(b.slug ?? "volet");
	const action = ACTIONS[String(b.action ?? "")];
	if (!action) return json(400, { error: "action invalide" });
	if (!await findDevice(deviceId, acc)) return json(403, { error: "device non possédé" });
	try {
		publishCmd(deviceId, slug, action);
	} catch {
		return json(503, { error: "relais indisponible" });
	}
	return json(200, { ok: true });
};
// \0virtual:astro:page:src/pages/api/cmd@_@ts
var page = () => cmd_exports;
export { page };
