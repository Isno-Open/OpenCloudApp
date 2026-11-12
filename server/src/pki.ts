// PKI de l'instance. Plus de script a lancer avant l'installation : la CA est creee au premier demarrage,
// et le certificat du broker est emis avec le NOM CHOISI A L'INSTALLATION (public ou reseau local).
//
// Deux dossiers, par separation des secrets :
// - PKI_DIR (prive au serveur) : ca.key ne sort JAMAIS d'ici ; ca.crt, relay.crt/relay.key.
// - BROKER_CERTS_DIR (partage avec le broker) : ca.crt, server.crt, server.key ; la cle appartient au
//   compte du broker (BROKER_UID), lisible par lui seul.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, chownSync, chmodSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { X509Certificate } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";

export const PKI_DIR = process.env.PKI_DIR ?? "/data/pki";
export const BROKER_CERTS_DIR = process.env.BROKER_CERTS_DIR ?? "/broker-certs";
const BROKER_UID = Number(process.env.BROKER_UID ?? 1883);   // compte « mosquitto » de l'image du broker
const CA_DAYS = "3650", CERT_DAYS = "1825";

const ssl = (args: string[]): void => { execFileSync("openssl", args, { stdio: "ignore" }); };
const p = (f: string): string => join(PKI_DIR, f);

/** Cree la CA si elle n'existe pas (premier demarrage). Ne la remplace jamais. */
export function ensureCA(): void {
  mkdirSync(PKI_DIR, { recursive: true, mode: 0o700 });
  if (existsSync(p("ca.key")) && existsSync(p("ca.crt"))) return;
  ssl(["genrsa", "-out", p("ca.key"), "2048"]);
  chmodSync(p("ca.key"), 0o600);
  ssl(["req", "-x509", "-new", "-nodes", "-key", p("ca.key"), "-sha256", "-days", CA_DAYS, "-subj", "/O=ISNO Cloud/CN=ISNO Cloud CA", "-out", p("ca.crt")]);
}

/** Emet un certificat signe par la CA. san : liste « DNS:x » / « IP:y », ou vide. */
function issue(key: string, crt: string, subject: string, san: string[]): void {
  const wd = mkdtempSync(join(tmpdir(), "pki-"));
  try {
    const csr = join(wd, "c.csr"), ext = join(wd, "ext.cnf");
    ssl(["genrsa", "-out", key, "2048"]);
    ssl(["req", "-new", "-key", key, "-subj", subject, "-out", csr]);
    const args = ["x509", "-req", "-in", csr, "-CA", p("ca.crt"), "-CAkey", p("ca.key"), "-CAcreateserial", "-sha256", "-days", CERT_DAYS, "-out", crt];
    if (san.length) { writeFileSync(ext, `subjectAltName=${san.join(",")}\n`); args.push("-extfile", ext); }
    ssl(args);
  } finally { rmSync(wd, { recursive: true, force: true }); }
}

/** Certificat du relais (CN=relay : acces complet par l'ACL du broker). */
export function ensureRelayCert(): void {
  if (existsSync(p("relay.key")) && existsSync(p("relay.crt"))) return;
  issue(p("relay.key"), p("relay.crt"), "/O=ISNO Cloud/CN=relay", []);
  chmodSync(p("relay.key"), 0o600);
}

const sanEntry = (host: string): string => (isIPv4(host) || isIPv6(host) ? `IP:${host}` : `DNS:${host}`);

/** Emet le certificat du broker pour son nom public (en premier) et son nom interne a la pile. */
export function issueBrokerCert(publicHost: string, internalHost: string): void {
  mkdirSync(BROKER_CERTS_DIR, { recursive: true });
  const key = join(BROKER_CERTS_DIR, "server.key"), crt = join(BROKER_CERTS_DIR, "server.crt");
  issue(key, crt, `/O=ISNO Cloud/CN=${publicHost}`, [...new Set([publicHost, internalHost, "localhost"])].map(sanEntry));
  copyFileSync(p("ca.crt"), join(BROKER_CERTS_DIR, "ca.crt"));
  chmodSync(key, 0o600); chmodSync(crt, 0o644); chmodSync(join(BROKER_CERTS_DIR, "ca.crt"), 0o644);
  // la cle doit appartenir au compte du broker ; seulement possible si le serveur tourne en root
  if (process.getuid?.() === 0) chownSync(key, BROKER_UID, BROKER_UID);
}

/** Noms inscrits dans le certificat du broker, dans l'ordre (le nom public d'abord). */
export function brokerCertNames(): string[] {
  try {
    const san = new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "server.crt"))).subjectAltName ?? "";
    return san.split(",").map((s) => s.trim()).map((s) => s.replace(/^DNS:/, "").replace(/^IP Address:/, "").toLowerCase());
  } catch { return []; }
}

/** Empreinte du certificat du broker (pour prouver qu'un nom public mene bien a NOTRE broker). */
export function brokerCertFingerprint(): string | null {
  try { return new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "server.crt"))).fingerprint256; } catch { return null; }
}

/** Fichiers lus par le relais et par l'emission des certificats d'appareils. */
export const PKI_FILES = { caCrt: p("ca.crt"), caKey: p("ca.key"), relayCrt: p("relay.crt"), relayKey: p("relay.key") };

/** Le certificat du broker est-il a jour pour ce nom ? Il faut le BON NOM en premier, une signature par
 *  la CA ACTUELLE, et la meme ca.crt cote broker. Sinon (nom change, CA recreee, volume reutilise d'une
 *  autre installation...), il doit etre reemis : le relais et les boitiers le refuseraient. */
export function brokerCertMatches(publicHost: string): boolean {
  try {
    const ca = new X509Certificate(readFileSync(p("ca.crt")));
    const crt = new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "server.crt")));
    const brokerCa = new X509Certificate(readFileSync(join(BROKER_CERTS_DIR, "ca.crt")));
    return brokerCertNames()[0] === publicHost.toLowerCase() && crt.verify(ca.publicKey) && brokerCa.fingerprint256 === ca.fingerprint256;
  } catch { return false; }
}
