import { _ as listDevices, m as getAccount, n as coversOf, p as findDevice, t as boot, u as countDevices } from "./boot_CuD6Xa_G.mjs";
import { u as DEVICE_TYPE } from "./i18n_CIzekdEZ.mjs";
// src/lib/cloud-data.ts
var mapType = (t) => Object.values(DEVICE_TYPE).find((k) => k === t) ?? null;
var boitierOf = (d) => {
	const covers = coversOf(d.deviceId);
	return {
		id: d.deviceId,
		name: d.name,
		firmware: d.firmware,
		online: covers.length > 0,
		updateAvailable: false,
		count: covers.length
	};
};
async function getAccountInfo(accountId) {
	await boot();
	const a = await getAccount(accountId);
	return {
		email: accountId,
		name: a?.name ?? null,
		admin: !!a?.admin,
		totpEnabled: !!a?.totpEnabled,
		boitiers: await countDevices(accountId),
		cap: a?.deviceCap ?? 5
	};
}
async function listBoitiers(accountId) {
	await boot();
	return (await listDevices(accountId)).map(boitierOf);
}
async function listAppareils(accountId) {
	await boot();
	const devices = await listDevices(accountId);
	const out = [];
	for (const d of devices) {
		const covers = coversOf(d.deviceId);
		const online = covers.length > 0;
		for (const c of covers) out.push({
			id: `${d.deviceId}:${c.slug}`,
			boitierId: d.deviceId,
			slug: c.slug,
			name: c.slug,
			type: mapType(c.type),
			declaredType: c.type,
			positional: c.positional,
			position: c.position,
			online
		});
	}
	return out;
}
async function getBoitier(id, accountId) {
	await boot();
	const d = await findDevice(id, accountId);
	return d ? boitierOf(d) : void 0;
}
export { listBoitiers as i, getBoitier as n, listAppareils as r, getAccountInfo as t };
