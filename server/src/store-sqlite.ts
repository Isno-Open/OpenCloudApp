// Implémentation SQLite (défaut self-host : léger, embarqué, un seul conteneur). Vraie DB (ACID,
// transactions). API async pour partager l'interface avec Mongo (better-sqlite3 est synchrone).
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DEVICE_AUTH_STATE, type Account, type Device, type Pairing, type DeviceAuth } from "./types.js";

const DB_PATH = process.env.DB_PATH ?? "/data/isno-cloud.db";
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, device_cap INTEGER NOT NULL DEFAULT 5, pass_hash TEXT, admin INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS devices (device_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, firmware TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS pairings (code TEXT PRIMARY KEY, account_id TEXT NOT NULL, device_id TEXT NOT NULL, name TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE IF NOT EXISTS device_auth (
    device_code TEXT PRIMARY KEY, user_code TEXT UNIQUE NOT NULL, device_id TEXT NOT NULL, firmware TEXT NOT NULL,
    state TEXT NOT NULL, account_id TEXT, name TEXT, expires_at INTEGER NOT NULL
  );
`);
// Migration : ajoute la colonne admin aux bases d'avant le role operateur, puis marque 'admin' operateur.
const accountCols = db.prepare("PRAGMA table_info(accounts)").all() as { name: string }[];
if (!accountCols.some((c) => c.name === "admin")) db.exec("ALTER TABLE accounts ADD COLUMN admin INTEGER NOT NULL DEFAULT 0");
db.prepare("INSERT OR IGNORE INTO accounts (id, device_cap, admin) VALUES ('admin', 5, 1)").run();
db.prepare("UPDATE accounts SET admin = 1 WHERE id = 'admin'").run();

const rowToAccount = (r: { id: string; deviceCap: number; passHash: string | null; admin: number } | undefined): Account | null =>
  r ? { id: r.id, deviceCap: r.deviceCap, passHash: r.passHash, admin: !!r.admin } : null;

export function init(): Promise<void> { return Promise.resolve(); }
export function getAccount(id: string): Promise<Account | null> {
  const r = db.prepare("SELECT id, device_cap AS deviceCap, pass_hash AS passHash, admin FROM accounts WHERE id = ?").get(id) as { id: string; deviceCap: number; passHash: string | null; admin: number } | undefined;
  return Promise.resolve(rowToAccount(r));
}
export function createAccount(id: string, passHash: string, cap: number, admin: boolean): Promise<void> {
  db.prepare("INSERT INTO accounts (id, device_cap, pass_hash, admin) VALUES (?,?,?,?)").run(id, cap, passHash, admin ? 1 : 0);
  return Promise.resolve();
}
export function listAccounts(): Promise<Account[]> {
  const rows = db.prepare("SELECT id, device_cap AS deviceCap, pass_hash AS passHash, admin FROM accounts ORDER BY admin DESC, id").all() as { id: string; deviceCap: number; passHash: string | null; admin: number }[];
  return Promise.resolve(rows.map((r) => ({ id: r.id, deviceCap: r.deviceCap, passHash: r.passHash, admin: !!r.admin })));
}
export function removeAccount(id: string): Promise<void> {
  const tx = db.transaction((a: string) => {
    db.prepare("DELETE FROM devices WHERE account_id = ?").run(a);
    db.prepare("DELETE FROM accounts WHERE id = ?").run(a);
  });
  tx(id);
  return Promise.resolve();
}
export function setAccountPass(id: string, passHash: string): Promise<void> {
  db.prepare("UPDATE accounts SET pass_hash = ? WHERE id = ?").run(passHash, id); return Promise.resolve();
}
export function countDevices(accountId: string): Promise<number> {
  return Promise.resolve((db.prepare("SELECT COUNT(*) AS n FROM devices WHERE account_id = ?").get(accountId) as { n: number }).n);
}
export function listDevices(accountId: string): Promise<Device[]> {
  return Promise.resolve(db.prepare("SELECT device_id AS deviceId, account_id AS accountId, name, firmware FROM devices WHERE account_id = ?").all(accountId) as Device[]);
}
export function findDevice(deviceId: string, accountId: string): Promise<Device | null> {
  const r = db.prepare("SELECT device_id AS deviceId, account_id AS accountId, name, firmware FROM devices WHERE device_id = ? AND account_id = ?").get(deviceId, accountId) as Device | undefined;
  return Promise.resolve(r ?? null);
}
export function addDevice(d: Device): Promise<void> {
  db.prepare("INSERT INTO devices (device_id, account_id, name, firmware) VALUES (?,?,?,?)").run(d.deviceId, d.accountId, d.name, d.firmware); return Promise.resolve();
}
// Enregistre (ou ré-enregistre) un appareil pour un compte. Idempotent : un ré-enrôlement du MÊME
// appareil par le MÊME compte met à jour ; un appareil déjà détenu par un AUTRE compte est refusé.
export function claimDevice(deviceId: string, accountId: string, name: string, firmware: string): Promise<boolean> {
  const tx = db.transaction((): boolean => {
    const r = db.prepare("SELECT account_id AS accountId FROM devices WHERE device_id = ?").get(deviceId) as { accountId: string } | undefined;
    if (!r) { db.prepare("INSERT INTO devices (device_id, account_id, name, firmware) VALUES (?,?,?,?)").run(deviceId, accountId, name, firmware); return true; }
    if (r.accountId !== accountId) return false;
    db.prepare("UPDATE devices SET name = ?, firmware = ? WHERE device_id = ?").run(name, firmware, deviceId);
    return true;
  });
  return Promise.resolve(tx());
}
export function renameDevice(deviceId: string, accountId: string, name: string): Promise<void> {
  db.prepare("UPDATE devices SET name = ? WHERE device_id = ? AND account_id = ?").run(name, deviceId, accountId); return Promise.resolve();
}
export function removeDevice(deviceId: string, accountId: string): Promise<void> {
  db.prepare("DELETE FROM devices WHERE device_id = ? AND account_id = ?").run(deviceId, accountId); return Promise.resolve();
}
export function addPairing(p: Pairing): Promise<void> {
  db.prepare("INSERT INTO pairings (code, account_id, device_id, name, used) VALUES (?,?,?,?,0)").run(p.code, p.accountId, p.deviceId, p.name); return Promise.resolve();
}
export function takePairing(code: string): Promise<Pairing | null> {
  const tx = db.transaction((c: string): Pairing | null => {
    const r = db.prepare("SELECT code, account_id AS accountId, device_id AS deviceId, name FROM pairings WHERE code = ? AND used = 0").get(c) as Pairing | undefined;
    if (!r) return null;
    db.prepare("UPDATE pairings SET used = 1 WHERE code = ?").run(c);
    return r;
  });
  return Promise.resolve(tx(code));
}
export function ensureAccount(id: string, cap: number): Promise<void> {
  db.prepare("INSERT OR IGNORE INTO accounts (id, device_cap) VALUES (?, ?)").run(id, cap);
  return Promise.resolve();
}

// ---- Device authorization grant (RFC 8628) ----
const AUTH_COLS = "device_code AS deviceCode, user_code AS userCode, device_id AS deviceId, firmware, state, account_id AS accountId, name, expires_at AS expiresAt";
export function startDeviceAuth(d: DeviceAuth): Promise<void> {
  db.prepare("INSERT INTO device_auth (device_code, user_code, device_id, firmware, state, account_id, name, expires_at) VALUES (?,?,?,?,?,?,?,?)")
    .run(d.deviceCode, d.userCode, d.deviceId, d.firmware, d.state, d.accountId, d.name, d.expiresAt);
  return Promise.resolve();
}
export function getDeviceAuthByUserCode(userCode: string): Promise<DeviceAuth | null> {
  const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE user_code = ?`).get(userCode) as DeviceAuth | undefined;
  return Promise.resolve(r ?? null);
}
export function pollDeviceAuth(deviceCode: string): Promise<DeviceAuth | null> {
  const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE device_code = ?`).get(deviceCode) as DeviceAuth | undefined;
  return Promise.resolve(r ?? null);
}
// L'utilisateur connecté approuve : pending -> approved (rattache le compte et le nom). Transactionnel :
// n'approuve qu'une demande encore en attente et non expirée.
export function approveDeviceAuth(userCode: string, accountId: string, name: string, now: number): Promise<DeviceAuth | null> {
  const tx = db.transaction((): DeviceAuth | null => {
    const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE user_code = ?`).get(userCode) as DeviceAuth | undefined;
    if (!r || r.state !== DEVICE_AUTH_STATE.pending || r.expiresAt < now) return null;
    const finalName = name.trim().length ? name.trim() : r.deviceId;
    db.prepare("UPDATE device_auth SET state = ?, account_id = ?, name = ? WHERE user_code = ?").run(DEVICE_AUTH_STATE.approved, accountId, finalName, userCode);
    return { ...r, state: DEVICE_AUTH_STATE.approved, accountId, name: finalName };
  });
  return Promise.resolve(tx());
}
// La box interroge et récupère son certificat : approved -> consumed, une seule fois.
export function consumeDeviceAuth(deviceCode: string, now: number): Promise<DeviceAuth | null> {
  const tx = db.transaction((): DeviceAuth | null => {
    const r = db.prepare(`SELECT ${AUTH_COLS} FROM device_auth WHERE device_code = ?`).get(deviceCode) as DeviceAuth | undefined;
    if (!r || r.state !== DEVICE_AUTH_STATE.approved || r.expiresAt < now) return null;
    db.prepare("UPDATE device_auth SET state = ? WHERE device_code = ?").run(DEVICE_AUTH_STATE.consumed, deviceCode);
    return { ...r, state: DEVICE_AUTH_STATE.consumed };
  });
  return Promise.resolve(tx());
}
