import { t as DEVICE_AUTH_STATE } from "./types_C9jyr2h_.mjs";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
// ../server/dist/store-sqlite.js
var DB_PATH = process.env.DB_PATH ?? "/data/isno-cloud.db";
mkdirSync(dirname(DB_PATH), { recursive: true });
var db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, device_cap INTEGER NOT NULL DEFAULT 5, pass_hash TEXT, admin INTEGER NOT NULL DEFAULT 0, name TEXT);
  CREATE TABLE IF NOT EXISTS devices (device_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, firmware TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS pairings (code TEXT PRIMARY KEY, account_id TEXT NOT NULL, device_id TEXT NOT NULL, name TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS device_auth (
    device_code TEXT PRIMARY KEY, user_code TEXT UNIQUE NOT NULL, device_id TEXT NOT NULL, firmware TEXT NOT NULL,
    state TEXT NOT NULL, account_id TEXT, name TEXT, expires_at INTEGER NOT NULL
  );
`);
var accountCols = db.prepare("PRAGMA table_info(accounts)").all();
if (!accountCols.some((c) => c.name === "admin")) db.exec("ALTER TABLE accounts ADD COLUMN admin INTEGER NOT NULL DEFAULT 0");
for (const [col, def] of [
	["name", "TEXT"],
	["failed_count", "INTEGER NOT NULL DEFAULT 0"],
	["locked_until", "INTEGER"],
	["totp_secret", "TEXT"],
	["totp_enabled", "INTEGER NOT NULL DEFAULT 0"],
	["totp_last_step", "INTEGER"]
]) if (!accountCols.some((c) => c.name === col)) db.exec(`ALTER TABLE accounts ADD COLUMN ${col} ${def}`);
var ACCOUNT_COLS = "id, name, device_cap AS deviceCap, pass_hash AS passHash, admin, failed_count AS failedCount, locked_until AS lockedUntil, totp_secret AS totpSecret, totp_enabled AS totpEnabled, totp_last_step AS totpLastStep";
var rowToAccount = (r) => r ? {
	id: r.id,
	name: r.name,
	deviceCap: r.deviceCap,
	passHash: r.passHash,
	admin: !!r.admin,
	failedCount: r.failedCount ?? 0,
	lockedUntil: r.lockedUntil,
	totpSecret: r.totpSecret,
	totpEnabled: !!r.totpEnabled,
	totpLastStep: r.totpLastStep
} : null;
function init() {
	return Promise.resolve();
}
function getAccount(id) {
	const r = db.prepare(`SELECT ${ACCOUNT_COLS} FROM accounts WHERE id = ?`).get(id);
	return Promise.resolve(rowToAccount(r));
}
function createAccount(id, name, passHash, cap, admin) {
	db.prepare("INSERT INTO accounts (id, name, device_cap, pass_hash, admin) VALUES (?,?,?,?,?)").run(id, name, cap, passHash, admin ? 1 : 0);
	return Promise.resolve();
}
/** Echec de connexion : incremente ; au seuil, bloque jusqu'a now + minutes. Rend la fin de blocage, ou null. */
function recordLoginFailure(id, maxFailures, minutes, now) {
	const tx = db.transaction(() => {
		const r = db.prepare("SELECT failed_count AS n FROM accounts WHERE id = ?").get(id);
		if (!r) return null;
		const n = r.n + 1;
		const until = n >= maxFailures ? now + minutes * 6e4 : null;
		db.prepare("UPDATE accounts SET failed_count = ?, locked_until = ? WHERE id = ?").run(until ? 0 : n, until, id);
		return until;
	});
	return Promise.resolve(tx());
}
function resetLoginFailures(id) {
	db.prepare("UPDATE accounts SET failed_count = 0, locked_until = NULL WHERE id = ?").run(id);
	return Promise.resolve();
}
function setTotp(id, secret, enabled) {
	db.prepare("UPDATE accounts SET totp_secret = ?, totp_enabled = ?, totp_last_step = NULL WHERE id = ?").run(secret, enabled ? 1 : 0, id);
	return Promise.resolve();
}
function setTotpLastStep(id, step) {
	db.prepare("UPDATE accounts SET totp_last_step = ? WHERE id = ?").run(step, id);
	return Promise.resolve();
}
function setAccountAdmin(id, admin) {
	db.prepare("UPDATE accounts SET admin = ? WHERE id = ?").run(admin ? 1 : 0, id);
	return Promise.resolve();
}
function listAccounts() {
	const rows = db.prepare(`SELECT ${ACCOUNT_COLS} FROM accounts ORDER BY admin DESC, id`).all();
	return Promise.resolve(rows.map((r) => rowToAccount(r)));
}
function removeAccount(id) {
	db.transaction((a) => {
		db.prepare("DELETE FROM devices WHERE account_id = ?").run(a);
		db.prepare("DELETE FROM accounts WHERE id = ?").run(a);
	})(id);
	return Promise.resolve();
}
function setAccountPass(id, passHash) {
	db.prepare("UPDATE accounts SET pass_hash = ? WHERE id = ?").run(passHash, id);
	return Promise.resolve();
}
function countDevices(accountId) {
	return Promise.resolve(db.prepare("SELECT COUNT(*) AS n FROM devices WHERE account_id = ?").get(accountId).n);
}
function listDevices(accountId) {
	return Promise.resolve(db.prepare("SELECT device_id AS deviceId, account_id AS accountId, name, firmware FROM devices WHERE account_id = ?").all(accountId));
}
function findDevice(deviceId, accountId) {
	const r = db.prepare("SELECT device_id AS deviceId, account_id AS accountId, name, firmware FROM devices WHERE device_id = ? AND account_id = ?").get(deviceId, accountId);
	return Promise.resolve(r ?? null);
}
function addDevice(d) {
	db.prepare("INSERT INTO devices (device_id, account_id, name, firmware) VALUES (?,?,?,?)").run(d.deviceId, d.accountId, d.name, d.firmware);
	return Promise.resolve();
}
function claimDevice(deviceId, accountId, name, firmware) {
	const tx = db.transaction(() => {
		const r = db.prepare("SELECT account_id AS accountId FROM devices WHERE device_id = ?").get(deviceId);
		if (!r) {
			db.prepare("INSERT INTO devices (device_id, account_id, name, firmware) VALUES (?,?,?,?)").run(deviceId, accountId, name, firmware);
			return true;
		}
		if (r.accountId !== accountId) return false;
		db.prepare("UPDATE devices SET name = ?, firmware = ? WHERE device_id = ?").run(name, firmware, deviceId);
		return true;
	});
	return Promise.resolve(tx());
}
function renameDevice(deviceId, accountId, name) {
	db.prepare("UPDATE devices SET name = ? WHERE device_id = ? AND account_id = ?").run(name, deviceId, accountId);
	return Promise.resolve();
}
function removeDevice(deviceId, accountId) {
	db.prepare("DELETE FROM devices WHERE device_id = ? AND account_id = ?").run(deviceId, accountId);
	return Promise.resolve();
}
function addPairing(p) {
	db.prepare("INSERT INTO pairings (code, account_id, device_id, name, used) VALUES (?,?,?,?,0)").run(p.code, p.accountId, p.deviceId, p.name);
	return Promise.resolve();
}
function takePairing(code) {
	const tx = db.transaction((c) => {
		const r = db.prepare("SELECT code, account_id AS accountId, device_id AS deviceId, name FROM pairings WHERE code = ? AND used = 0").get(c);
		if (!r) return null;
		db.prepare("UPDATE pairings SET used = 1 WHERE code = ?").run(c);
		return r;
	});
	return Promise.resolve(tx(code));
}
function ensureAccount(id, cap) {
	db.prepare("INSERT OR IGNORE INTO accounts (id, device_cap) VALUES (?, ?)").run(id, cap);
	return Promise.resolve();
}
var AUTH_COLS = "device_code AS deviceCode, user_code AS userCode, device_id AS deviceId, firmware, state, account_id AS accountId, name, expires_at AS expiresAt";
function startDeviceAuth(d) {
	db.prepare("INSERT INTO device_auth (device_code, user_code, device_id, firmware, state, account_id, name, expires_at) VALUES (?,?,?,?,?,?,?,?)").run(d.deviceCode, d.userCode, d.deviceId, d.firmware, d.state, d.accountId, d.name, d.expiresAt);
	return Promise.resolve();
}
function getDeviceAuthByUserCode(userCode) {
	const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE user_code = ?`).get(userCode);
	return Promise.resolve(r ?? null);
}
function pollDeviceAuth(deviceCode) {
	const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE device_code = ?`).get(deviceCode);
	return Promise.resolve(r ?? null);
}
function approveDeviceAuth(userCode, accountId, name, now) {
	const tx = db.transaction(() => {
		const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE user_code = ?`).get(userCode);
		if (!r || r.state !== DEVICE_AUTH_STATE.pending || r.expiresAt < now) return null;
		const finalName = name.trim().length ? name.trim() : r.deviceId;
		db.prepare("UPDATE device_auth SET state = ?, account_id = ?, name = ? WHERE user_code = ?").run(DEVICE_AUTH_STATE.approved, accountId, finalName, userCode);
		return {
			...r,
			state: DEVICE_AUTH_STATE.approved,
			accountId,
			name: finalName
		};
	});
	return Promise.resolve(tx());
}
function purgeExpiredDeviceAuth(now) {
	return Promise.resolve(db.prepare("DELETE FROM device_auth WHERE expires_at < ?").run(now).changes);
}
function consumeDeviceAuth(deviceCode, now) {
	const tx = db.transaction(() => {
		const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE device_code = ?`).get(deviceCode);
		if (!r || r.state !== DEVICE_AUTH_STATE.approved || r.expiresAt < now) return null;
		db.prepare("UPDATE device_auth SET state = ? WHERE device_code = ?").run(DEVICE_AUTH_STATE.consumed, deviceCode);
		return {
			...r,
			state: DEVICE_AUTH_STATE.consumed
		};
	});
	return Promise.resolve(tx());
}
export { addDevice, addPairing, approveDeviceAuth, claimDevice, consumeDeviceAuth, countDevices, createAccount, ensureAccount, findDevice, getAccount, getDeviceAuthByUserCode, init, listAccounts, listDevices, pollDeviceAuth, purgeExpiredDeviceAuth, recordLoginFailure, removeAccount, removeDevice, renameDevice, resetLoginFailures, setAccountAdmin, setAccountPass, setTotp, setTotpLastStep, startDeviceAuth, takePairing };
