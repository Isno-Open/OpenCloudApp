import { r as brokerCertMatches, s as issueBrokerCert } from "./pki_DfnIFSmA.mjs";
import { a as installModule, c as restartModule, r as getModule, t as BROKER_MODULE } from "./supervisor_DmaMSdpl.mjs";
import { chmodSync, copyFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
// ../server/dist/broker-config.js
var BROKER_CONFIG_DIR = process.env.BROKER_CONFIG_DIR ?? "/broker-config";
var TEMPLATE_DIR = process.env.BROKER_CONFIG_TEMPLATE ?? "/app/broker-config-template";
var FILES = ["mosquitto.conf", "acl"];
function writeBrokerConfig() {
	mkdirSync(BROKER_CONFIG_DIR, { recursive: true });
	for (const f of FILES) {
		copyFileSync(join(TEMPLATE_DIR, f), join(BROKER_CONFIG_DIR, f));
		chmodSync(join(BROKER_CONFIG_DIR, f), 420);
	}
}
// src/server/broker.ts
/** Nom interne du broker dans la pile (hote de l'adresse annoncee par le catalogue). */
async function brokerInternal() {
	const r = await getModule(BROKER_MODULE);
	if (!r.ok) return { error: r.error };
	if (!r.module.endpoint) return { error: "adresse interne du broker inconnue (catalogue)" };
	return {
		host: new URL(r.module.endpoint).hostname,
		url: r.module.endpoint
	};
}
/** Emet le certificat pour ce nom, ecrit la config, et installe ou redemarre le broker. */
async function prepareBroker(publicHost) {
	const internal = await brokerInternal();
	if ("error" in internal) return {
		ok: false,
		error: internal.error
	};
	const host = publicHost.replace(/:\d+$/, "");
	const changed = !brokerCertMatches(host);
	if (changed) issueBrokerCert(host, internal.host);
	writeBrokerConfig();
	const st = await getModule(BROKER_MODULE);
	if (!st.ok) return st;
	if (st.module.ready) return changed ? restartModule(BROKER_MODULE) : st;
	return installModule(BROKER_MODULE);
}
export { prepareBroker as n, brokerInternal as t };
