import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
// ../server/dist/auth.js
function hashPass(pass) {
	const salt = randomBytes(16);
	return salt.toString("hex") + ":" + scryptSync(pass, salt, 32).toString("hex");
}
function verifyPass(pass, stored) {
	const i = stored.indexOf(":");
	if (i < 0) return false;
	const salt = Buffer.from(stored.slice(0, i), "hex");
	const want = Buffer.from(stored.slice(i + 1), "hex");
	const got = scryptSync(pass, salt, 32);
	return got.length === want.length && timingSafeEqual(got, want);
}
// ../server/dist/config.js
var DB_KIND = {
	sqlite: "sqlite",
	mongoBundled: "mongo-bundled",
	mongoExternal: "mongo-external"
};
var DB_MODULE = {
	[DB_KIND.sqlite]: null,
	[DB_KIND.mongoBundled]: "mongo",
	[DB_KIND.mongoExternal]: null
};
var CONFIG_PATH = process.env.PORTAL_CONFIG ?? "/data/portal.config.json";
var cache;
function loadConfig() {
	if (cache !== void 0) return cache;
	cache = seedFromEnv();
	if (cache) return cache;
	try {
		if (existsSync(CONFIG_PATH)) cache = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
	} catch {
		cache = null;
	}
	if (cache === void 0) cache = null;
	return cache;
}
function isConfigured() {
	return loadConfig() !== null;
}
function saveConfig(c) {
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
	chmodSync(CONFIG_PATH, 384);
	cache = c;
}
function applyStoreEnv(c) {
	if (c.db.kind === DB_KIND.sqlite) {
		delete process.env.MONGO_URL;
		if (c.db.sqlitePath) process.env.DB_PATH = c.db.sqlitePath;
	} else if (c.db.mongoUrl) process.env.MONGO_URL = c.db.mongoUrl;
}
function seedFromEnv() {
	if (process.env.PORTAL_SEED !== "1" || existsSync(CONFIG_PATH)) return null;
	const mongo = process.env.MONGO_URL;
	const c = {
		configured: true,
		db: mongo ? {
			kind: DB_KIND.mongoExternal,
			mongoUrl: mongo
		} : {
			kind: DB_KIND.sqlite,
			sqlitePath: process.env.DB_PATH
		},
		publicAppUrl: process.env.PUBLIC_APP_URL ?? "https://app.isno.fr",
		brokerPublicUrl: process.env.BROKER_URL_PUBLIC ?? "mqtts://mqtt.isno.fr:8883",
		operator: process.env.ADMIN_EMAIL && process.env.ADMIN_PASS ? {
			email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
			name: process.env.ADMIN_NAME?.trim() || process.env.ADMIN_EMAIL.trim(),
			passHash: hashPass(process.env.ADMIN_PASS)
		} : null
	};
	mkdirSync(dirname(CONFIG_PATH), { recursive: true });
	writeFileSync(CONFIG_PATH, JSON.stringify(c, null, 2));
	try {
		chmodSync(CONFIG_PATH, 384);
	} catch {}
	return c;
}
var SETUP_WINDOW_S = Number(process.env.PORTAL_SETUP_WINDOW_S ?? 300);
var processStartedAt = () => Date.now() - process.uptime() * 1e3;
/** Secondes restantes dans la fenetre d'installation (0 si fermee ou instance deja configuree). */
function setupWindowRemaining() {
	if (isConfigured()) return 0;
	const left = SETUP_WINDOW_S - (Date.now() - processStartedAt()) / 1e3;
	return left > 0 ? Math.floor(left) : 0;
}
var setupWindowOpen = () => setupWindowRemaining() > 0;
export { isConfigured as a, setupWindowOpen as c, verifyPass as d, applyStoreEnv as i, setupWindowRemaining as l, DB_MODULE as n, loadConfig as o, SETUP_WINDOW_S as r, saveConfig as s, DB_KIND as t, hashPass as u };
