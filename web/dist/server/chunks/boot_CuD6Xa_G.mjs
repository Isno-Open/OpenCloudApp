import { a as ensureCA, o as ensureRelayCert, t as PKI_FILES } from "./pki_DfnIFSmA.mjs";
import { i as applyStoreEnv, o as loadConfig } from "./config_2VUiG471.mjs";
import { n as prepareBroker, t as brokerInternal } from "./broker_BEK5ykmn.mjs";
import { readFileSync } from "node:fs";
import mqtt from "mqtt";
// ../server/dist/store.js
var impl = null;
var m = () => {
	if (!impl) throw new Error("store non initialisé");
	return impl;
};
async function init() {
	impl = await (process.env.MONGO_URL ? import("./store-mongo_DpAgqrHJ.mjs") : import("./store-sqlite_C-wIgEzg.mjs"));
	await impl.init();
	console.log(`[store] ${process.env.MONGO_URL ? "MongoDB" : "SQLite"}`);
}
var getAccount = (id) => m().getAccount(id);
var setAccountPass = (id, h) => m().setAccountPass(id, h);
var createAccount = (id, name, passHash, cap, admin) => m().createAccount(id, name, passHash, cap, admin);
var listAccounts = () => m().listAccounts();
var setAccountAdmin = (id, admin) => m().setAccountAdmin(id, admin);
var recordLoginFailure = (id, max, minutes, now) => m().recordLoginFailure(id, max, minutes, now);
var resetLoginFailures = (id) => m().resetLoginFailures(id);
var setTotp = (id, secret, enabled) => m().setTotp(id, secret, enabled);
var setTotpLastStep = (id, step) => m().setTotpLastStep(id, step);
var removeAccount = (id) => m().removeAccount(id);
var countDevices = (a) => m().countDevices(a);
var listDevices = (a) => m().listDevices(a);
var findDevice = (d, a) => m().findDevice(d, a);
var renameDevice = (d, a, name) => m().renameDevice(d, a, name);
var removeDevice = (d, a) => m().removeDevice(d, a);
var addPairing = (p) => m().addPairing(p);
var takePairing = (c) => m().takePairing(c);
var ensureAccount = (id, cap) => m().ensureAccount(id, cap);
var claimDevice = (d, a, name, fw) => m().claimDevice(d, a, name, fw);
var startDeviceAuth = (d) => m().startDeviceAuth(d);
var getDeviceAuthByUserCode = (userCode) => m().getDeviceAuthByUserCode(userCode);
var pollDeviceAuth = (deviceCode) => m().pollDeviceAuth(deviceCode);
var approveDeviceAuth = (userCode, accountId, name, now) => m().approveDeviceAuth(userCode, accountId, name, now);
var purgeExpiredDeviceAuth = (now) => m().purgeExpiredDeviceAuth(now);
var consumeDeviceAuth = (deviceCode, now) => m().consumeDeviceAuth(deviceCode, now);
// ../server/dist/entitlement.js
var DEFAULT_CAP = Number(process.env.DEVICE_CAP ?? 5);
/** true si le compte est au plafond (ne peut plus enrôler). */
var overCap = (deviceCount, cap) => deviceCount >= cap;
// ../server/dist/mqtt.js
var ACTIONS = {
	UP: "OPEN",
	STOP: "STOP",
	DOWN: "CLOSE"
};
var cmdTopic = (deviceId, slug) => `openprofalux/${deviceId}/cover/${slug}/set`;
var cmdPayload = (action) => ACTIONS[action];
var newCover = (slug) => ({
	slug,
	type: "",
	positional: false,
	up: "▲",
	stop: "■",
	down: "▼",
	state: null,
	position: null
});
/** Applique un message d'état de cover à la carte. Fonction pure (testable sans broker). */
function applyCoverMessage(covers, topic, payload) {
	const m = /^openprofalux\/([^/]+)\/cover\/([^/]+)\/(attrs|state|position)$/.exec(topic);
	if (!m) return;
	const dev = m[1], slug = m[2], leaf = m[3];
	let byDev = covers.get(dev);
	if (!byDev) {
		byDev = /* @__PURE__ */ new Map();
		covers.set(dev, byDev);
	}
	let c = byDev.get(slug);
	if (!c) {
		c = newCover(slug);
		byDev.set(slug, c);
	}
	if (leaf === "attrs") try {
		const a = JSON.parse(payload);
		if (typeof a["type"] === "string") c.type = a["type"];
		if (typeof a["positional"] === "boolean") c.positional = a["positional"];
		if (typeof a["up"] === "string") c.up = a["up"];
		if (typeof a["stop"] === "string") c.stop = a["stop"];
		if (typeof a["down"] === "string") c.down = a["down"];
	} catch {}
	else if (leaf === "state") c.state = payload;
	else {
		const n = Number(payload);
		if (Number.isFinite(n)) c.position = n;
	}
}
var covers = /* @__PURE__ */ new Map();
var coversOf = (deviceId) => [...covers.get(deviceId)?.values() ?? []];
var client = null;
function get(brokerUrl) {
	if (client) return client;
	client = mqtt.connect(brokerUrl, {
		ca: readFileSync(PKI_FILES.caCrt),
		cert: readFileSync(PKI_FILES.relayCrt),
		key: readFileSync(PKI_FILES.relayKey),
		rejectUnauthorized: true
	});
	client.on("error", (e) => console.error("[mqtt relay]", e.message));
	client.on("message", (t, p) => applyCoverMessage(covers, t, p.toString("utf8")));
	return client;
}
/** Démarre le relais vers le broker (adresse INTERNE à la pile, fournie par le catalogue du
*  superviseur) et l'abonnement à l'état des covers (retained => peuplé au branchement). */
function startRelay(brokerUrl) {
	const c = get(brokerUrl);
	const sub = () => {
		for (const leaf of [
			"attrs",
			"state",
			"position"
		]) c.subscribe(`openprofalux/+/cover/+/${leaf}`, { qos: 0 });
	};
	c.on("connect", sub);
	if (c.connected) sub();
}
function publishCmd(deviceId, slug, action) {
	if (!client) throw new Error("relais non démarré");
	client.publish(cmdTopic(deviceId, slug), cmdPayload(action), { qos: 1 });
}
// src/server/boot.ts
var log = (what, e) => console.error(`[boot] ${what} :`, e instanceof Error ? e.message : e);
var started = null;
function boot() {
	if (!started) started = (async () => {
		try {
			ensureCA();
			ensureRelayCert();
		} catch (e) {
			log("PKI", e);
		}
		const cfg = loadConfig();
		if (!cfg) return;
		applyStoreEnv(cfg);
		await init();
		if (cfg.operator && !await getAccount(cfg.operator.email)) await createAccount(cfg.operator.email, cfg.operator.name, cfg.operator.passHash, DEFAULT_CAP, true);
		try {
			const r = await prepareBroker(new URL(cfg.brokerPublicUrl).hostname);
			if (!r.ok) log("broker", r.error);
			const internal = await brokerInternal();
			if ("error" in internal) log("relais", internal.error);
			else startRelay(internal.url);
		} catch (e) {
			log("broker/relais", e);
		}
	})();
	return started;
}
export { takePairing as A, renameDevice as C, setTotp as D, setAccountPass as E, setTotpLastStep as O, removeDevice as S, setAccountAdmin as T, listDevices as _, overCap as a, recordLoginFailure as b, claimDevice as c, createAccount as d, ensureAccount as f, listAccounts as g, getDeviceAuthByUserCode as h, DEFAULT_CAP as i, startDeviceAuth as k, consumeDeviceAuth as l, getAccount as m, coversOf as n, addPairing as o, findDevice as p, publishCmd as r, approveDeviceAuth as s, boot as t, countDevices as u, pollDeviceAuth as v, resetLoginFailures as w, removeAccount as x, purgeExpiredDeviceAuth as y };
