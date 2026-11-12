import { chmodSync, chownSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { X509Certificate } from "node:crypto";
import { execFileSync } from "node:child_process";
import { isIPv4, isIPv6 } from "node:net";
// ../server/dist/pki.js
var PKI_DIR = process.env.PKI_DIR ?? "/data/pki";
var BROKER_CERTS_DIR = process.env.BROKER_CERTS_DIR ?? "/broker-certs";
var BROKER_UID = Number(process.env.BROKER_UID ?? 1883);
var CA_DAYS = "3650";
var CERT_DAYS = "1825";
var ssl = (args) => {
	execFileSync("openssl", args, { stdio: "ignore" });
};
var p = (f) => join(PKI_DIR, f);
/** Cree la CA si elle n'existe pas (premier demarrage). Ne la remplace jamais. */
function ensureCA() {
	mkdirSync(PKI_DIR, {
		recursive: true,
		mode: 448
	});
	if (existsSync(p("ca.key")) && existsSync(p("ca.crt"))) return;
	ssl([
		"genrsa",
		"-out",
		p("ca.key"),
		"2048"
	]);
	chmodSync(p("ca.key"), 384);
	ssl([
		"req",
		"-x509",
		"-new",
		"-nodes",
		"-key",
		p("ca.key"),
		"-sha256",
		"-days",
		CA_DAYS,
		"-subj",
		"/O=ISNO Cloud/CN=ISNO Cloud CA",
		"-out",
		p("ca.crt")
	]);
}
/** Emet un certificat signe par la CA. san : liste « DNS:x » / « IP:y », ou vide. */
function issue(key, crt, subject, san) {
	const wd = mkdtempSync(join(tmpdir(), "pki-"));
	try {
		const csr = join(wd, "c.csr"), ext = join(wd, "ext.cnf");
		ssl([
			"genrsa",
			"-out",
			key,
			"2048"
		]);
		ssl([
			"req",
			"-new",
			"-key",
			key,
			"-subj",
			subject,
			"-out",
			csr
		]);
		const args = [
			"x509",
			"-req",
			"-in",
			csr,
			"-CA",
			p("ca.crt"),
			"-CAkey",
			p("ca.key"),
			"-CAcreateserial",
			"-sha256",
			"-days",
			CERT_DAYS,
			"-out",
			crt
		];
		if (san.length) {
			writeFileSync(ext, `subjectAltName=${san.join(",")}\n`);
			args.push("-extfile", ext);
		}
		ssl(args);
	} finally {
		rmSync(wd, {
			recursive: true,
			force: true
		});
	}
}
/** Certificat du relais (CN=relay : acces complet par l'ACL du broker). */
function ensureRelayCert() {
	if (existsSync(p("relay.key")) && existsSync(p("relay.crt"))) return;
	issue(p("relay.key"), p("relay.crt"), "/O=ISNO Cloud/CN=relay", []);
	chmodSync(p("relay.key"), 384);
}
var sanEntry = (host) => isIPv4(host) || isIPv6(host) ? `IP:${host}` : `DNS:${host}`;
/** Emet le certificat du broker pour son nom public (en premier) et son nom interne a la pile. */
function issueBrokerCert(publicHost, internalHost) {
	mkdirSync(BROKER_CERTS_DIR, { recursive: true });
	const key = join(BROKER_CERTS_DIR, "server.key"), crt = join(BROKER_CERTS_DIR, "server.crt");
	issue(key, crt, `/O=ISNO Cloud/CN=${publicHost}`, [.../* @__PURE__ */ new Set([
		publicHost,
		internalHost,
		"localhost"
	])].map(sanEntry));
	copyFileSync(p("ca.crt"), join(BROKER_CERTS_DIR, "ca.crt"));
	chmodSync(key, 384);
	chmodSync(crt, 420);
	chmodSync(join(BROKER_CERTS_DIR, "ca.crt"), 420);
	if (process.getuid?.() === 0) chownSync(key, BROKER_UID, BROKER_UID);
}
/** Noms inscrits dans le certificat du broker, dans l'ordre (le nom public d'abord). */
function brokerCertNames() {
	try {
		return (new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "server.crt"))).subjectAltName ?? "").split(",").map((s) => s.trim()).map((s) => s.replace(/^DNS:/, "").replace(/^IP Address:/, "").toLowerCase());
	} catch {
		return [];
	}
}
/** Empreinte du certificat du broker (pour prouver qu'un nom public mene bien a NOTRE broker). */
function brokerCertFingerprint() {
	try {
		return new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "server.crt"))).fingerprint256;
	} catch {
		return null;
	}
}
/** Fichiers lus par le relais et par l'emission des certificats d'appareils. */
var PKI_FILES = {
	caCrt: p("ca.crt"),
	caKey: p("ca.key"),
	relayCrt: p("relay.crt"),
	relayKey: p("relay.key")
};
/** Le certificat du broker est-il a jour pour ce nom ? Il faut le BON NOM en premier, une signature par
*  la CA ACTUELLE, et la meme ca.crt cote broker. Sinon (nom change, CA recreee, volume reutilise d'une
*  autre installation...), il doit etre reemis : le relais et les boitiers le refuseraient. */
function brokerCertMatches(publicHost) {
	try {
		const ca = new X509Certificate(readFileSync(p("ca.crt")));
		const crt = new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "server.crt")));
		const brokerCa = new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "ca.crt")));
		return brokerCertNames()[0] === publicHost.toLowerCase() && crt.verify(ca.publicKey) && brokerCa.fingerprint256 === ca.fingerprint256;
	} catch {
		return false;
	}
}
export { ensureCA as a, brokerCertNames as i, brokerCertFingerprint as n, ensureRelayCert as o, brokerCertMatches as r, issueBrokerCert as s, PKI_FILES as t };
