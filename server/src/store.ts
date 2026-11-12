// Frontière DB unique. Le serveur n'importe QUE ce module. Implémentation choisie au démarrage :
// MONGO_URL défini -> MongoDB (ISNO) ; sinon -> SQLite (défaut self-host). Pluggable, pas de JSON.
import type { Account, Device, Pairing } from "./types.js";
export type { Account, Device, Pairing };

type Impl = typeof import("./store-sqlite.js");
let impl: Impl | null = null;
const m = (): Impl => { if (!impl) throw new Error("store non initialisé"); return impl; };

export async function init(): Promise<void> {
  impl = await (process.env.MONGO_URL ? import("./store-mongo.js") : import("./store-sqlite.js"));
  await impl.init();
  console.log(`[store] ${process.env.MONGO_URL ? "MongoDB" : "SQLite"}`);
}
export const getAccount = (id: string): Promise<Account | null> => m().getAccount(id);
export const setAccountPass = (id: string, h: string): Promise<void> => m().setAccountPass(id, h);
export const countDevices = (a: string): Promise<number> => m().countDevices(a);
export const listDevices = (a: string): Promise<Device[]> => m().listDevices(a);
export const findDevice = (d: string, a: string): Promise<Device | null> => m().findDevice(d, a);
export const addDevice = (d: Device): Promise<void> => m().addDevice(d);
export const renameDevice = (d: string, a: string, name: string): Promise<void> => m().renameDevice(d, a, name);
export const removeDevice = (d: string, a: string): Promise<void> => m().removeDevice(d, a);
export const addPairing = (p: Pairing): Promise<void> => m().addPairing(p);
export const takePairing = (c: string): Promise<Pairing | null> => m().takePairing(c);
export const ensureAccount = (id: string, cap: number): Promise<void> => m().ensureAccount(id, cap);
