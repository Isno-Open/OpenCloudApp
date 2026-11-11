// Implémentation MongoDB (instance ISNO / à l'échelle). Activée quand MONGO_URL est défini.
import { MongoClient, type Collection } from "mongodb";
import type { Account, Device, Pairing } from "./types.js";

const URL = process.env.MONGO_URL ?? "mongodb://mongo:27017";
const DBNAME = process.env.MONGO_DB ?? "isno_cloud";
const client = new MongoClient(URL);
type PairingRow = Pairing & { used: boolean };
const accounts = (): Collection<Account> => client.db(DBNAME).collection<Account>("accounts");
const devices = (): Collection<Device> => client.db(DBNAME).collection<Device>("devices");
const pairings = (): Collection<PairingRow> => client.db(DBNAME).collection<PairingRow>("pairings");

export async function init(): Promise<void> {
  await client.connect();
  await accounts().createIndex({ id: 1 }, { unique: true });
  await devices().createIndex({ deviceId: 1 }, { unique: true });
  await pairings().createIndex({ code: 1 }, { unique: true });
  await accounts().updateOne({ id: "admin" }, { $setOnInsert: { id: "admin", deviceCap: 5, passHash: null } }, { upsert: true });
}
export const getAccount = (id: string): Promise<Account | null> => accounts().findOne({ id }, { projection: { _id: 0 } });
export async function setAccountPass(id: string, passHash: string): Promise<void> { await accounts().updateOne({ id }, { $set: { passHash } }); }
export const countDevices = (accountId: string): Promise<number> => devices().countDocuments({ accountId });
export const listDevices = (accountId: string): Promise<Device[]> => devices().find({ accountId }, { projection: { _id: 0 } }).toArray();
export const findDevice = (deviceId: string, accountId: string): Promise<Device | null> => devices().findOne({ deviceId, accountId }, { projection: { _id: 0 } });
export async function addDevice(d: Device): Promise<void> { await devices().insertOne(d); }
export async function addPairing(p: Pairing): Promise<void> { await pairings().insertOne({ ...p, used: false }); }
export async function takePairing(code: string): Promise<Pairing | null> {
  const r = await pairings().findOneAndUpdate({ code, used: false }, { $set: { used: true } }, { projection: { _id: 0, used: 0 } });
  return r ? { code: r.code, accountId: r.accountId, deviceId: r.deviceId, name: r.name } : null;
}
