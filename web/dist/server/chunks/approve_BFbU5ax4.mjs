import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { a as overCap, m as getAccount, s as approveDeviceAuth, u as countDevices } from "./boot_CuD6Xa_G.mjs";
import { a as normalizeUserCode } from "./device-code_COVWacCR.mjs";
import { s as resolveAccountId } from "./auth_Da2rUxTp.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { n as LINK_ERROR } from "./link_CcbVL7PN.mjs";
// src/pages/api/device/approve.ts
var approve_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	const acc = await resolveAccountId(request);
	if (!acc) return json(401, { error: LINK_ERROR.auth });
	const b = await readBody(request);
	const code = normalizeUserCode(String(b.code ?? ""));
	if (!code) return json(400, { error: LINK_ERROR.invalid });
	const a = await getAccount(acc);
	if (!a) return json(401, { error: LINK_ERROR.auth });
	if (overCap(await countDevices(acc), a.deviceCap)) return json(403, {
		error: LINK_ERROR.cap,
		cap: a.deviceCap
	});
	const rec = await approveDeviceAuth(code, acc, String(b.name ?? "").slice(0, 60), Date.now());
	if (!rec) return json(400, { error: LINK_ERROR.invalid });
	return json(200, {
		ok: true,
		device_id: rec.deviceId
	});
};
// \0virtual:astro:page:src/pages/api/device/approve@_@ts
var page = () => approve_exports;
export { page };
