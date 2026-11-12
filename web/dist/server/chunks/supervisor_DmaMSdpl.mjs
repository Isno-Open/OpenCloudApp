import { readFileSync } from "node:fs";
// src/server/supervisor.ts
var URL_BASE = (process.env.SUPERVISOR_URL ?? "http://supervisor:8090").replace(/\/$/, "");
var TOKEN_FILE = process.env.SUPERVISOR_TOKEN_FILE ?? "/control/token";
async function call(method, path) {
	let token;
	try {
		token = readFileSync(TOKEN_FILE, "utf8").trim();
	} catch {
		return {
			ok: false,
			error: "superviseur absent : secret introuvable"
		};
	}
	try {
		const r = await fetch(URL_BASE + path, {
			method,
			headers: { authorization: `Bearer ${token}` },
			signal: AbortSignal.timeout(5e3)
		});
		const d = await r.json();
		return r.ok ? {
			ok: true,
			module: d
		} : {
			ok: false,
			error: d.error ?? `superviseur : ${r.status}`
		};
	} catch (e) {
		return {
			ok: false,
			error: `superviseur injoignable (${e instanceof Error ? e.message : String(e)})`
		};
	}
}
var getModule = (id) => call("GET", `/modules/${encodeURIComponent(id)}`);
var installModule = (id) => call("POST", `/modules/${encodeURIComponent(id)}/install`);
var restartModule = (id) => call("POST", `/modules/${encodeURIComponent(id)}/restart`);
/** Module obligatoire de la pile : le broker (identifiant du catalogue du superviseur). */
var BROKER_MODULE = "broker";
async function callJson(method, path, body, timeoutMs = 5e3) {
	let token;
	try {
		token = readFileSync(TOKEN_FILE, "utf8").trim();
	} catch {
		return {
			ok: false,
			error: "superviseur absent : secret introuvable"
		};
	}
	try {
		const r = await fetch(URL_BASE + path, {
			method,
			headers: {
				authorization: `Bearer ${token}`,
				...body ? { "content-type": "application/json" } : {}
			},
			body: body ? JSON.stringify(body) : void 0,
			signal: AbortSignal.timeout(timeoutMs)
		});
		const d = await r.json();
		return r.ok ? {
			ok: true,
			data: d
		} : {
			ok: false,
			error: d.error ?? `superviseur : ${r.status}`
		};
	} catch (e) {
		return {
			ok: false,
			error: `superviseur injoignable (${e instanceof Error ? e.message : String(e)})`
		};
	}
}
/** Catalogue courant, apres relecture des sources ajoutees (le superviseur les telecharge et les valide). */
var listCatalogPlugins = async (sources) => {
	const r = await callJson("POST", "/plugins/sources", { urls: sources }, 3e4);
	return r.ok ? {
		ok: true,
		...r.data
	} : r;
};
var catalogPlugin = (id) => callJson("GET", `/plugins/${encodeURIComponent(id)}`);
var installCatalogPlugin = (id) => callJson("POST", `/plugins/${encodeURIComponent(id)}/install`);
var removeCatalogPlugin = (id) => callJson("POST", `/plugins/${encodeURIComponent(id)}/remove`);
export { installModule as a, restartModule as c, installCatalogPlugin as i, catalogPlugin as n, listCatalogPlugins as o, getModule as r, removeCatalogPlugin as s, BROKER_MODULE as t };
