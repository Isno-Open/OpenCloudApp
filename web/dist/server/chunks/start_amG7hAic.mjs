import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { k as startDeviceAuth, t as boot, y as purgeExpiredDeviceAuth } from "./boot_CuD6Xa_G.mjs";
import { t as DEVICE_AUTH_STATE } from "./types_C9jyr2h_.mjs";
import { i as newUserCode, n as displayUserCode, r as newDeviceCode } from "./device-code_COVWacCR.mjs";
import { o as loadConfig } from "./config_2VUiG471.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
import { n as ROUTES, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { randomBytes } from "node:crypto";
// src/pages/api/device/start.ts
var start_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var FIRMWARE_RE = /^[a-z0-9._-]{1,40}$/;
var POST = async ({ request }) => {
	await boot();
	const cfg = loadConfig();
	if (!cfg) return json(503, { error: "not configured" });
	const b = await readBody(request);
	const fw = String(b.firmware ?? "openprofalux");
	const firmware = FIRMWARE_RE.test(fw) ? fw : "openprofalux";
	const now = Date.now();
	await purgeExpiredDeviceAuth(now);
	const deviceCode = newDeviceCode();
	const deviceId = "opf-" + randomBytes(5).toString("hex");
	for (let i = 0; i < 3; i++) {
		const userCode = newUserCode();
		try {
			await startDeviceAuth({
				deviceCode,
				userCode,
				deviceId,
				firmware,
				state: DEVICE_AUTH_STATE.pending,
				accountId: null,
				name: null,
				expiresAt: now + 6e5
			});
			const uri = cfg.publicAppUrl.replace(/\/$/, "") + ROUTES.lier[LANG.fr];
			return json(200, {
				device_code: deviceCode,
				user_code: displayUserCode(userCode),
				verification_uri: uri,
				verification_uri_complete: `${uri}?code=${userCode}`,
				interval: 5,
				expires_in: 600
			});
		} catch {}
	}
	return json(500, { error: "retry" });
};
// \0virtual:astro:page:src/pages/api/device/start@_@ts
var page = () => start_exports;
export { page };
