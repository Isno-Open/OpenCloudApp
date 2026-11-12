import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { A as takePairing, c as claimDevice, t as boot } from "./boot_CuD6Xa_G.mjs";
import { t as issueDeviceCert } from "./ca_DU65slaX.mjs";
import { o as loadConfig } from "./config_2VUiG471.mjs";
import { n as readBody, t as json } from "./http_GIg9YBvo.mjs";
// src/pages/api/enroll.ts
var enroll_exports = /* @__PURE__ */ __exportAll({ POST: () => POST });
var POST = async ({ request }) => {
	await boot();
	const b = await readBody(request);
	const p = await takePairing(String(b.code ?? ""));
	if (!p) return json(400, { error: "code invalide ou déjà utilisé" });
	if (!await claimDevice(p.deviceId, p.accountId, p.name, String(b.firmware ?? "openprofalux"))) return json(409, { error: "appareil rattaché à un autre compte" });
	const bundle = issueDeviceCert(p.deviceId);
	return json(200, {
		device_id: p.deviceId,
		broker_url: loadConfig()?.brokerPublicUrl ?? "",
		...bundle
	});
};
// \0virtual:astro:page:src/pages/api/enroll@_@ts
var page = () => enroll_exports;
export { page };
