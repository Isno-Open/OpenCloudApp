import { i as brokerCertNames, n as brokerCertFingerprint } from "./pki_DfnIFSmA.mjs";
import { randomBytes } from "node:crypto";
import { isIP } from "node:net";
import { lookup } from "node:dns/promises";
import { connect } from "node:tls";
// src/server/hosts.ts
var BROKER_PUBLIC_PORT = Number(process.env.BROKER_PUBLIC_PORT ?? 8883);
/** Identifiant aleatoire de CE process : prouve qu'une URL publique mene bien a cette instance. */
var INSTANCE_NONCE = randomBytes(16).toString("hex");
/** Nom propose pour le broker : celui de son certificat s'il existe deja, sinon derive du nom du
*  portail (app.exemple.fr -> mqtt.exemple.fr ; une IP ou un nom court -> le meme). Modifiable. */
function suggestBrokerHost(appHost) {
	const fromCert = brokerCertNames()[0];
	if (fromCert) return fromCert;
	const h = appHost.replace(/:\d+$/, "");
	if (isIP(h) || !h.includes(".")) return h;
	const labels = h.split(".");
	return "mqtt." + (labels.length > 2 ? labels.slice(1) : labels).join(".");
}
var HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*(:[0-9]{1,5})?$/;
var normalizeHost = (h) => {
	const v = h.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/\/.*$/, "");
	return HOST_RE.test(v) ? v : null;
};
var HOST_CHECK = {
	appFormat: "appFormat",
	appDns: "appDns",
	appReach: "appReach",
	brokerFormat: "brokerFormat",
	brokerDns: "brokerDns",
	brokerCert: "brokerCert",
	brokerPort: "brokerPort"
};
/** Ouvre une connexion TLS vers host:port et rend l'empreinte du certificat presente (null si injoignable).
*  Le broker exige un certificat client, mais il presente le sien avant : c'est lui qu'on compare. */
var remoteFingerprint = (host, port, ms = 5e3) => new Promise((res) => {
	let s;
	try {
		s = connect({
			host,
			port,
			...isIP(host) ? {} : { servername: host },
			rejectUnauthorized: false
		});
	} catch {
		res(null);
		return;
	}
	const done = (v) => {
		s.destroy();
		res(v);
	};
	s.setTimeout(ms, () => done(null));
	s.once("secureConnect", () => done(s.getPeerX509Certificate()?.fingerprint256 ?? null));
	s.once("error", () => done(null));
});
var resolves = async (host) => {
	try {
		return (await lookup(host.replace(/:\d+$/, ""))).address;
	} catch {
		return null;
	}
};
/** DNS puis preuve que le nom mene a CETTE instance (nonce du process). */
async function appReachChecks(app, scheme) {
	const out = [];
	const ip = await resolves(app);
	out.push({
		check: HOST_CHECK.appDns,
		ok: !!ip,
		detail: ip ? `résout vers ${ip}` : "ne se résout pas (DNS)"
	});
	if (!ip) return out;
	let reach = "injoignable";
	try {
		const d = await (await fetch(`${scheme}://${app}/api/setup/whoami`, { signal: AbortSignal.timeout(6e3) })).json().catch(() => ({}));
		reach = d.nonce === INSTANCE_NONCE ? "mène bien à cette instance" : d.nonce ? "répond, mais mène à une AUTRE instance" : "répond, mais ce n'est pas ce portail";
	} catch (e) {
		reach = `injoignable (${e instanceof Error ? e.cause instanceof Error ? e.cause.message : e.message : String(e)})`;
	}
	out.push({
		check: HOST_CHECK.appReach,
		ok: reach === "mène bien à cette instance",
		detail: `${scheme}://${app} ${reach}`
	});
	return out;
}
/** Verifie le seul nom du portail (changement depuis Parametres). */
async function checkAppHost(appHost, scheme) {
	const app = normalizeHost(appHost);
	const checks = [{
		check: HOST_CHECK.appFormat,
		ok: !!app,
		detail: app ?? "nom d'hôte invalide"
	}];
	if (app) checks.push(...await appReachChecks(app, scheme));
	return {
		ok: checks.every((c) => c.ok),
		host: app,
		checks
	};
}
/** Verifie les deux noms ; chaque point est rendu, pour un message precis en cas d'echec. */
async function checkHosts(appHost, brokerHost, scheme) {
	const checks = [];
	const app = normalizeHost(appHost), broker = normalizeHost(brokerHost)?.replace(/:\d+$/, "") ?? null;
	checks.push({
		check: HOST_CHECK.appFormat,
		ok: !!app,
		detail: app ?? "nom d'hôte invalide"
	});
	checks.push({
		check: HOST_CHECK.brokerFormat,
		ok: !!broker,
		detail: broker ?? "nom d'hôte invalide"
	});
	if (app) checks.push(...await appReachChecks(app, scheme));
	if (broker) {
		const names = brokerCertNames();
		const inCert = names.includes(broker);
		checks.push({
			check: HOST_CHECK.brokerCert,
			ok: inCert,
			detail: inCert ? "présent dans le certificat du broker" : names.length ? `absent du certificat (qui contient : ${names.join(", ")})` : "certificat du broker introuvable"
		});
		const ip = await resolves(broker.replace(/:\d+$/, ""));
		checks.push({
			check: HOST_CHECK.brokerDns,
			ok: !!ip,
			detail: ip ? `résout vers ${ip}` : "ne se résout pas (DNS)"
		});
		if (ip) {
			const remote = await remoteFingerprint(broker, BROKER_PUBLIC_PORT), local = brokerCertFingerprint();
			const same = !!remote && remote === local;
			checks.push({
				check: HOST_CHECK.brokerPort,
				ok: same,
				detail: !remote ? `port ${BROKER_PUBLIC_PORT} injoignable ou fermé` : same ? `${broker}:${BROKER_PUBLIC_PORT} mène bien au broker de cette instance` : `${broker}:${BROKER_PUBLIC_PORT} répond, mais avec un AUTRE certificat (autre serveur)`
			});
		}
	}
	return {
		ok: checks.every((c) => c.ok),
		checks
	};
}
/** Protocole public de la requete (derriere un reverse-proxy : X-Forwarded-Proto). */
var requestScheme = (request) => (request.headers.get("x-forwarded-proto") ?? new URL(request.url).protocol.replace(":", "")).split(",")[0].trim();
export { normalizeHost as a, checkHosts as i, INSTANCE_NONCE as n, requestScheme as o, checkAppHost as r, suggestBrokerHost as s, BROKER_PUBLIC_PORT as t };
