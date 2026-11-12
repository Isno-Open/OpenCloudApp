// Frontière DB unique. Le serveur n'importe QUE ce module. Implémentation choisie au démarrage :
// MONGO_URL défini -> MongoDB (ISNO) ; sinon -> SQLite (défaut self-host). Pluggable, pas de JSON.
import type { Account, Device, Pairing, DeviceAuth } from "./types.js";
export type { Account, Device, Pairing, DeviceAuth };

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
export const createAccount = (id: string, passHash: string, cap: number, admin: boolean): Promise<void> => m().createAccount(id, passHash, cap, admin);
export const listAccounts = (): Promise<Account[]> => m().listAccounts();
export const removeAccount = (id: string): Promise<void> => m().removeAccount(id);
export const countDevices = (a: string): Promise<number> => m().countDevices(a);
export const listDevices = (a: string): Promise<Device[]> => m().listDevices(a);
export const findDevice = (d: string, a: string): Promise<Device | null> => m().findDevice(d, a);
export const addDevice = (d: Device): Promise<void> => m().addDevice(d);
export const renameDevice = (d: string, a: string, name: string): Promise<void> => m().renameDevice(d, a, name);
export const removeDevice = (d: string, a: string): Promise<void> => m().removeDevice(d, a);
export const addPairing = (p: Pairing): Promise<void> => m().addPairing(p);
export const takePairing = (c: string): Promise<Pairing | null> => m().takePairing(c);
export const ensureAccount = (id: string, cap: number): Promise<void> => m().ensureAccount(id, cap);
export const claimDevice = (d: string, a: string, name: string, fw: string): Promise<boolean> => m().claimDevice(d, a, name, fw);
export const startDeviceAuth = (d: DeviceAuth): Promise<void> => m().startDeviceAuth(d);
export const getDeviceAuthByUserCode = (userCode: string): Promise<DeviceAuth | null> => m().getDeviceAuthByUserCode(userCode);
export const pollDeviceAuth = (deviceCode: string): Promise<DeviceAuth | null> => m().pollDeviceAuth(deviceCode);
export const approveDeviceAuth = (userCode: string, accountId: string, name: string, now: number): Promise<DeviceAuth | null> => m().approveDeviceAuth(userCode, accountId, name, now);
export const consumeDeviceAuth = (deviceCode: string, now: number): Promise<DeviceAuth | null> => m().consumeDeviceAuth(deviceCode, now);
