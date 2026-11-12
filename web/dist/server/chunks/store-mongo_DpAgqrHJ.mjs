import { t as DEVICE_AUTH_STATE } from "./types_C9jyr2h_.mjs";
import { MongoClient } from "mongodb";
// ../server/dist/store-mongo.js
var URL = process.env.MONGO_URL ?? "mongodb://mongo:27017";
var DBNAME = process.env.MONGO_DB ?? "isno_cloud";
var client = new MongoClient(URL);
var accounts = () => client.db(DBNAME).collection("accounts");
var devices = () => client.db(DBNAME).collection("devices");
var pairings = () => client.db(DBNAME).collection("pairings");
var deviceAuth = () => client.db(DBNAME).collection("device_auth");
async function init() {
	await client.connect();
	await accounts().createIndex({ id: 1 }, { unique: true });
	await devices().createIndex({ deviceId: 1 }, { unique: true });
	await pairings().createIndex({ code: 1 }, { unique: true });
	await deviceAuth().createIndex({ deviceCode: 1 }, { unique: true });
	await deviceAuth().createIndex({ userCode: 1 }, { unique: true });
}
var withAdmin = (a) => a ? {
	...a,
	admin: a.admin ?? false,
	name: a.name ?? null,
	failedCount: a.failedCount ?? 0,
	lockedUntil: a.lockedUntil ?? null,
	totpSecret: a.totpSecret ?? null,
	totpEnabled: a.totpEnabled ?? false,
	totpLastStep: a.totpLastStep ?? null
} : null;
var getAccount = (id) => accounts().findOne({ id }, { projection: { _id: 0 } }).then(withAdmin);
async function createAccount(id, name, passHash, cap, admin) {
	await accounts().insertOne({
		id,
		name,
		deviceCap: cap,
		passHash,
		admin,
		failedCount: 0,
		lockedUntil: null,
		totpSecret: null,
		totpEnabled: false,
		totpLastStep: null
	});
}
async function recordLoginFailure(id, maxFailures, minutes, now) {
	const a = await accounts().findOneAndUpdate({ id }, { $inc: { failedCount: 1 } }, { returnDocument: "after" });
	if (!a) return null;
	if ((a.failedCount ?? 0) < maxFailures) return null;
	const until = now + minutes * 6e4;
	await accounts().updateOne({ id }, { $set: {
		failedCount: 0,
		lockedUntil: until
	} });
	return until;
}
async function resetLoginFailures(id) {
	await accounts().updateOne({ id }, { $set: {
		failedCount: 0,
		lockedUntil: null
	} });
}
async function setTotp(id, secret, enabled) {
	await accounts().updateOne({ id }, { $set: {
		totpSecret: secret,
		totpEnabled: enabled,
		totpLastStep: null
	} });
}
async function setTotpLastStep(id, step) {
	await accounts().updateOne({ id }, { $set: { totpLastStep: step } });
}
async function setAccountAdmin(id, admin) {
	await accounts().updateOne({ id }, { $set: { admin } });
}
async function listAccounts() {
	return (await accounts().find({}, { projection: { _id: 0 } }).toArray()).map((a) => withAdmin(a)).sort((x, y) => Number(y.admin) - Number(x.admin) || x.id.localeCompare(y.id));
}
async function removeAccount(id) {
	await devices().deleteMany({ accountId: id });
	await accounts().deleteOne({ id });
}
async function setAccountPass(id, passHash) {
	await accounts().updateOne({ id }, { $set: { passHash } });
}
var countDevices = (accountId) => devices().countDocuments({ accountId });
var listDevices = (accountId) => devices().find({ accountId }, { projection: { _id: 0 } }).toArray();
var findDevice = (deviceId, accountId) => devices().findOne({
	deviceId,
	accountId
}, { projection: { _id: 0 } });
async function addDevice(d) {
	await devices().insertOne(d);
}
async function renameDevice(deviceId, accountId, name) {
	await devices().updateOne({
		deviceId,
		accountId
	}, { $set: { name } });
}
async function removeDevice(deviceId, accountId) {
	await devices().deleteOne({
		deviceId,
		accountId
	});
}
async function addPairing(p) {
	await pairings().insertOne({
		...p,
		used: false
	});
}
async function takePairing(code) {
	const r = await pairings().findOneAndUpdate({
		code,
		used: false
	}, { $set: { used: true } }, { projection: {
		_id: 0,
		used: 0
	} });
	return r ? {
		code: r.code,
		accountId: r.accountId,
		deviceId: r.deviceId,
		name: r.name
	} : null;
}
async function ensureAccount(id, cap) {
	await accounts().updateOne({ id }, { $setOnInsert: {
		id,
		name: null,
		deviceCap: cap,
		passHash: null,
		admin: false,
		failedCount: 0,
		lockedUntil: null,
		totpSecret: null,
		totpEnabled: false,
		totpLastStep: null
	} }, { upsert: true });
}
async function claimDevice(deviceId, accountId, name, firmware) {
	const existing = await devices().findOne({ deviceId });
	if (existing && existing.accountId !== accountId) return false;
	await devices().updateOne({ deviceId }, { $set: {
		deviceId,
		accountId,
		name,
		firmware
	} }, { upsert: true });
	return true;
}
var noId = { projection: { _id: 0 } };
async function startDeviceAuth(d) {
	await deviceAuth().insertOne({ ...d });
}
var getDeviceAuthByUserCode = (userCode) => deviceAuth().findOne({ userCode }, noId);
var pollDeviceAuth = (deviceCode) => deviceAuth().findOne({ deviceCode }, noId);
async function approveDeviceAuth(userCode, accountId, name, now) {
	const current = await deviceAuth().findOne({ userCode });
	if (!current) return null;
	const finalName = name.trim().length ? name.trim() : current.deviceId;
	return await deviceAuth().findOneAndUpdate({
		userCode,
		state: DEVICE_AUTH_STATE.pending,
		expiresAt: { $gt: now }
	}, { $set: {
		state: DEVICE_AUTH_STATE.approved,
		accountId,
		name: finalName
	} }, {
		returnDocument: "after",
		projection: { _id: 0 }
	}) ?? null;
}
async function purgeExpiredDeviceAuth(now) {
	return (await deviceAuth().deleteMany({ expiresAt: { $lt: now } })).deletedCount;
}
async function consumeDeviceAuth(deviceCode, now) {
	return await deviceAuth().findOneAndUpdate({
		deviceCode,
		state: DEVICE_AUTH_STATE.approved,
		expiresAt: { $gt: now }
	}, { $set: { state: DEVICE_AUTH_STATE.consumed } }, {
		returnDocument: "after",
		projection: { _id: 0 }
	}) ?? null;
}
export { addDevice, addPairing, approveDeviceAuth, claimDevice, consumeDeviceAuth, countDevices, createAccount, ensureAccount, findDevice, getAccount, getDeviceAuthByUserCode, init, listAccounts, listDevices, pollDeviceAuth, purgeExpiredDeviceAuth, recordLoginFailure, removeAccount, removeDevice, renameDevice, resetLoginFailures, setAccountAdmin, setAccountPass, setTotp, setTotpLastStep, startDeviceAuth, takePairing };
