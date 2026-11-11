// Stockage minimal (JSON) de l'état du cloud : comptes, devices, codes de pairing.
// MVP self-host ; l'instance hébergée ISNO branchera les comptes www par-dessus (glu privée).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

/** Un compte (self-host). `deviceCap` = plafond d'appareils (défaut 5). */
export type Account = { id: string; deviceCap: number; passHash?: string };
/** Un appareil enrôlé, rattaché à un compte. `firmware` pilote l'IHM côté app. */
export type Device = { deviceId: string; accountId: string; name: string; firmware: string };
/** Un code de pairing : lie un futur device à un compte, à usage unique. */
export type Pairing = { code: string; accountId: string; deviceId: string; name: string; used: boolean };
export type Db = { accounts: Account[]; devices: Device[]; pairings: Pairing[] };

const DB_PATH = process.env.DB_PATH ?? "/data/db.json";

export function loadDb(): Db {
  if (!existsSync(DB_PATH)) return { accounts: [{ id: "admin", deviceCap: 5 }], devices: [], pairings: [] };
  return JSON.parse(readFileSync(DB_PATH, "utf8")) as Db;
}

export function saveDb(db: Db): void {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}
