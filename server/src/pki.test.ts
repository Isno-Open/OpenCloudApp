import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, existsSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { X509Certificate } from "node:crypto";
const root = mkdtempSync(join(tmpdir(), "isno-pki-"));
process.env.PKI_DIR = join(root, "pki");
process.env.BROKER_CERTS_DIR = join(root, "broker");
const pki = await import("./pki.js");
const cert = (f: string) => new X509Certificate(readFileSync(f));

test("CA : creee au premier appel, jamais remplacee ensuite", () => {
  pki.ensureCA();
  const first = cert(pki.PKI_FILES.caCrt).fingerprint256;
  pki.ensureCA();
  assert.equal(cert(pki.PKI_FILES.caCrt).fingerprint256, first);
  assert.equal(statSync(pki.PKI_FILES.caKey).mode & 0o777, 0o600);
});
test("relais : certificat CN=relay signe par la CA", () => {
  pki.ensureRelayCert();
  const c = cert(pki.PKI_FILES.relayCrt);
  assert.match(c.subject, /CN=relay/);
  assert.ok(c.verify(cert(pki.PKI_FILES.caCrt).publicKey));
});
test("broker : nom public en premier, nom interne ensuite, signe par la CA", () => {
  pki.issueBrokerCert("mqtt.exemple.fr", "isno-mqtt");
  assert.deepEqual(pki.brokerCertNames(), ["mqtt.exemple.fr", "isno-mqtt", "localhost"]);
  assert.ok(cert(join(process.env.BROKER_CERTS_DIR!, "server.crt")).verify(cert(pki.PKI_FILES.caCrt).publicKey));
  assert.equal(pki.brokerCertFingerprint(), cert(join(process.env.BROKER_CERTS_DIR!, "server.crt")).fingerprint256);
});
test("broker : une IP est acceptee comme nom (reseau local)", () => {
  pki.issueBrokerCert("192.168.1.20", "isno-mqtt");
  assert.equal(pki.brokerCertNames()[0], "192.168.1.20");
});
test("broker : reemettre change le certificat mais garde la meme CA (appareils deja enroles)", () => {
  const before = pki.brokerCertFingerprint();
  const ca = cert(pki.PKI_FILES.caCrt).fingerprint256;
  pki.issueBrokerCert("mqtt.autre.fr", "isno-mqtt");
  assert.notEqual(pki.brokerCertFingerprint(), before);
  assert.equal(cert(join(process.env.BROKER_CERTS_DIR!, "ca.crt")).fingerprint256, ca);
});
test("separation des secrets : la cle de la CA n'est JAMAIS dans le dossier du broker", () => {
  assert.equal(existsSync(join(process.env.BROKER_CERTS_DIR!, "ca.key")), false);
  assert.equal(statSync(join(process.env.BROKER_CERTS_DIR!, "server.key")).mode & 0o777, 0o600);
});
test("broker a jour : bon nom + signe par la CA actuelle ; sinon reemission requise", () => {
  pki.issueBrokerCert("mqtt.exemple.fr", "isno-mqtt");
  assert.equal(pki.brokerCertMatches("mqtt.exemple.fr"), true);
  assert.equal(pki.brokerCertMatches("mqtt.autre.fr"), false);          // nom change
});
test("broker signe par une AUTRE CA (volume reutilise) : detecte comme perime", async () => {
  // une seconde PKI independante emet un certificat broker au meme nom dans le meme dossier broker
  const other = mkdtempSync(join(tmpdir(), "isno-pki2-"));
  const { execFileSync } = await import("node:child_process");
  execFileSync("openssl", ["genrsa", "-out", join(other, "ca.key"), "2048"], { stdio: "ignore" });
  execFileSync("openssl", ["req", "-x509", "-new", "-nodes", "-key", join(other, "ca.key"), "-days", "2", "-subj", "/CN=Autre CA", "-out", join(other, "ca.crt")], { stdio: "ignore" });
  execFileSync("openssl", ["req", "-new", "-newkey", "rsa:2048", "-nodes", "-keyout", join(other, "s.key"), "-subj", "/CN=mqtt.exemple.fr", "-out", join(other, "s.csr")], { stdio: "ignore" });
  const { writeFileSync, copyFileSync } = await import("node:fs");
  writeFileSync(join(other, "ext"), "subjectAltName=DNS:mqtt.exemple.fr\n");
  execFileSync("openssl", ["x509", "-req", "-in", join(other, "s.csr"), "-CA", join(other, "ca.crt"), "-CAkey", join(other, "ca.key"), "-CAcreateserial", "-days", "2", "-extfile", join(other, "ext"), "-out", join(process.env.BROKER_CERTS_DIR!, "server.crt")], { stdio: "ignore" });
  copyFileSync(join(other, "ca.crt"), join(process.env.BROKER_CERTS_DIR!, "ca.crt"));
  assert.equal(pki.brokerCertNames()[0], "mqtt.exemple.fr");             // meme nom...
  assert.equal(pki.brokerCertMatches("mqtt.exemple.fr"), false);         // ...mais mauvaise CA
});
