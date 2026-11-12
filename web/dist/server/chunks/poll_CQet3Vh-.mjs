import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { c as claimDevice, l as consumeDeviceAuth, t as boot, v as pollDeviceAuth } from "./boot_CuD6Xa_G.mjs";
import { t as issueDeviceCert } from "./ca_DU65slaX.mjs";
import { t as DEVICE_AUTH_STATE } from "./types_C9jyr2h_.mjs";
import { t as POLL_STATUS } from "./device-code_COVWacCR.mjs";
import { o as loadConfig } from "./config_2VUiG471.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/device/poll.ts
var poll_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	await boot();
	const cfg = loadConfig();
	if (!cfg) return json(503, { error: "not configured" });
	const deviceCode = String((await readBody(request)).device_code ?? "");
	const now = Date.now();
	const rec = await pollDeviceAuth(deviceCode);
	if (!rec || rec.expiresAt < now || rec.state === DEVICE_AUTH_STATE.consumed) return json(410, { status: POLL_STATUS.expired });
	if (rec.state === DEVICE_AUTH_STATE.pending) return json(200, {
		status: POLL_STATUS.pending,
		interval: 5
	});
	const taken = await consumeDeviceAuth(deviceCode, now);
	if (!taken?.accountId) return json(410, { status: POLL_STATUS.expired });
	if (!await claimDevice(taken.deviceId, taken.accountId, taken.name ?? taken.deviceId, taken.firmware)) return json(409, { status: POLL_STATUS.denied });
	const bundle = issueDeviceCert(taken.deviceId);
	return json(200, {
		status: POLL_STATUS.ready,
		device_id: taken.deviceId,
		broker_url: cfg.brokerPublicUrl,
		...bundle
	});
};
// \0virtual:astro:page:src/pages/api/device/poll@_@ts
var page = () => poll_exports;
export { page };
