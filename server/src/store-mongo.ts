// Implémentation MongoDB (instance ISNO / à l'échelle). Activée quand MONGO_URL est défini.
import { MongoClient, type Collection } from "mongodb";
import { DEVICE_AUTH_STATE, type Account, type Device, type Pairing, type DeviceAuth } from "./types.js";

const URL = process.env.MONGO_URL ?? "mongodb://mongo:27017";
const DBNAME = process.env.MONGO_DB ?? "isno_cloud";
const client = new MongoClient(URL);
type PairingRow = Pairing & { used: boolean };
const accounts = (): Collection<Account> => client.db(DBNAME).collection<Account>("accounts");
const devices = (): Collection<Device> => client.db(DBNAME).collection<Device>("devices");
const pairings = (): Collection<PairingRow> => client.db(DBNAME).collection<PairingRow>("pairings");
const deviceAuth = (): Collection<DeviceAuth> => client.db(DBNAME).collection<DeviceAuth>("device_auth");

export async function init(): Promise<void> {
  await client.connect();
  await accounts().createIndex({ id: 1 }, { unique: true });
  await devices().createIndex({ deviceId: 1 }, { unique: true });
  await pairings().createIndex({ code: 1 }, { unique: true });
  await deviceAuth().createIndex({ deviceCode: 1 }, { unique: true });
  await deviceAuth().createIndex({ userCode: 1 }, { unique: true });
  await accounts().updateOne({ id: "admin" }, { $setOnInsert: { id: "admin", deviceCap: 5, passHash: null, admin: true } }, { upsert: true });
}
const withAdmin = (a: Account | null): Account | null => (a ? { ...a, admin: a.admin ?? false } : null);
export const getAccount = (id: string): Promise<Account | null> => accounts().findOne({ id }, { projection: { _id: 0 } }).then(withAdmin);
export async function createAccount(id: string, passHash: string, cap: number, admin: boolean): Promise<void> {
  await accounts().insertOne({ id, deviceCap: cap, passHash, admin });
}
export async function listAccounts(): Promise<Account[]> {
  const rows = await accounts().find({}, { projection: { _id: 0 } }).toArray();
  return rows.map((a) => ({ ...a, admin: a.admin ?? false })).sort((x, y) => Number(y.admin) - Number(x.admin) || x.id.localeCompare(y.id));
}
export async function removeAccount(id: string): Promise<void> {
  await devices().deleteMany({ accountId: id });
  await accounts().deleteOne({ id });
}
export async function setAccountPass(id: string, passHash: string): Promise<void> { await accounts().updateOne({ id }, { $set: { passHash } }); }
export const countDevices = (accountId: string): Promise<number> => devices().countDocuments({ accountId });
export const listDevices = (accountId: string): Promise<Device[]> => devices().find({ accountId }, { projection: { _id: 0 } }).toArray();
export const findDevice = (deviceId: string, accountId: string): Promise<Device | null> => devices().findOne({ deviceId, accountId }, { projection: { _id: 0 } });
export async function addDevice(d: Device): Promise<void> { await devices().insertOne(d); }
export async function renameDevice(deviceId: string, accountId: string, name: string): Promise<void> { await devices().updateOne({ deviceId, accountId }, { $set: { name } }); }
export async function removeDevice(deviceId: string, accountId: string): Promise<void> { await devices().deleteOne({ deviceId, accountId }); }
export async function addPairing(p: Pairing): Promise<void> { await pairings().insertOne({ ...p, used: false }); }
export async function takePairing(code: string): Promise<Pairing | null> {
  const r = await pairings().findOneAndUpdate({ code, used: false }, { $set: { used: true } }, { projection: { _id: 0, used: 0 } });
  return r ? { code: r.code, accountId: r.accountId, deviceId: r.deviceId, name: r.name } : null;
}
export async function ensureAccount(id: string, cap: number): Promise<void> {
  await accounts().updateOne({ id }, { $setOnInsert: { id, deviceCap: cap, passHash: null } }, { upsert: true });
}
export async function claimDevice(deviceId: string, accountId: string, name: string, firmware: string): Promise<boolean> {
  const existing = await devices().findOne({ deviceId });
  if (existing && existing.accountId !== accountId) return false;
  await devices().updateOne({ deviceId }, { $set: { deviceId, accountId, name, firmware } }, { upsert: true });
  return true;
}

// ---- Device authorization grant (RFC 8628) ----
const noId = { projection: { _id: 0 } } as const;
export async function startDeviceAuth(d: DeviceAuth): Promise<void> { await deviceAuth().insertOne({ ...d }); }
export const getDeviceAuthByUserCode = (userCode: string): Promise<DeviceAuth | null> => deviceAuth().findOne({ userCode }, noId);
export const pollDeviceAuth = (deviceCode: string): Promise<DeviceAuth | null> => deviceAuth().findOne({ deviceCode }, noId);
export async function approveDeviceAuth(userCode: string, accountId: string, name: string, now: number): Promise<DeviceAuth | null> {
  const current = await deviceAuth().findOne({ userCode });
  if (!current) return null;
  const finalName = name.trim().length ? name.trim() : current.deviceId;
  const r = await deviceAuth().findOneAndUpdate(
    { userCode, state: DEVICE_AUTH_STATE.pending, expiresAt: { $gt: now } },
    { $set: { state: DEVICE_AUTH_STATE.approved, accountId, name: finalName } },
    { returnDocument: "after", projection: { _id: 0 } });
  return r ?? null;
}
export async function purgeExpiredDeviceAuth(now: number): Promise<number> {
  return (await deviceAuth().deleteMany({ expiresAt: { $lt: now } })).deletedCount;
}
export async function consumeDeviceAuth(deviceCode: string, now: number): Promise<DeviceAuth | null> {
  const r = await deviceAuth().findOneAndUpdate(
    { deviceCode, state: DEVICE_AUTH_STATE.approved, expiresAt: { $gt: now } },
    { $set: { state: DEVICE_AUTH_STATE.consumed } },
    { returnDocument: "after", projection: { _id: 0 } });
  return r ?? null;
}
