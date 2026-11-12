import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as overCap, m as getAccount, o as addPairing, u as countDevices } from "./boot_CuD6Xa_G.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { randomBytes } from "node:crypto";
// src/pages/api/device/new.ts
var new_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "";
var code6 = () => randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
var POST = async ({ request }) => {
	const b = await readBody(request);
	let accountId = await resolveAccountId(request);
	if (!accountId) {
		if (!ADMIN_TOKEN || request.headers.get("authorization") !== `Bearer ${ADMIN_TOKEN}`) return json(401, { error: "unauthorized" });
		accountId = String(b.accountId ?? "").trim().toLowerCase();
		if (!accountId) return json(400, { error: "accountId requis" });
	}
	const deviceId = String(b.deviceId ?? "opf-" + randomBytes(5).toString("hex"));
	const acc = await getAccount(accountId);
	if (!acc) return json(404, { error: "account inconnu" });
	if (overCap(await countDevices(accountId), acc.deviceCap)) return json(403, {
		error: "plafond atteint",
		cap: acc.deviceCap
	});
	const p = {
		code: code6(),
		accountId,
		deviceId,
		name: String(b.name ?? deviceId)
	};
	await addPairing(p);
	return json(200, {
		code: p.code,
		deviceId
	});
};
// \0virtual:astro:page:src/pages/api/device/new@_@ts
var page = () => new_exports;
export { page };
