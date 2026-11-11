// Implémentation SQLite (défaut self-host : léger, embarqué, un seul conteneur). Vraie DB (ACID,
// transactions). API async pour partager l'interface avec Mongo (better-sqlite3 est synchrone).
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import type { Account, Device, Pairing } from "./types.js";

const DB_PATH = process.env.DB_PATH ?? "/data/isno-cloud.db";
mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (id TEXT PRIMARY KEY, device_cap INTEGER NOT NULL DEFAULT 5, pass_hash TEXT);
  CREATE TABLE IF NOT EXISTS devices (device_id TEXT PRIMARY KEY, account_id TEXT NOT NULL, name TEXT NOT NULL, firmware TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS pairings (code TEXT PRIMARY KEY, account_id TEXT NOT NULL, device_id TEXT NOT NULL, name TEXT NOT NULL, used INTEGER NOT NULL DEFAULT 0);
`);
db.prepare("INSERT OR IGNORE INTO accounts (id, device_cap) VALUES ('admin', 5)").run();

export function init(): Promise<void> { return Promise.resolve(); }
export function getAccount(id: string): Promise<Account | null> {
  const r = db.prepare("SELECT id, device_cap AS deviceCap, pass_hash AS passHash FROM accounts WHERE id = ?").get(id) as Account | undefined;
  return Promise.resolve(r ?? null);
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
