import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "isno-store-")), "t.db");
const s = await import("./store-sqlite.js");
await s.init();

test("le compte admin est semé avec un plafond de 5", async () => {
  const a = await s.getAccount("admin");
  assert.equal(a?.deviceCap, 5);
});
test("mot de passe : écriture puis relecture", async () => {
  await s.setAccountPass("admin", "SEL:HASH");
  assert.equal((await s.getAccount("admin"))?.passHash, "SEL:HASH");
});
test("pairing : usage unique (le 2e take refuse)", async () => {
  await s.addPairing({ code: "AAA111", accountId: "admin", deviceId: "dev-1", name: "V1" });
  assert.equal((await s.takePairing("AAA111"))?.deviceId, "dev-1");
  assert.equal(await s.takePairing("AAA111"), null);
});
test("device : ajout, comptage, liste, et propriété vérifiée", async () => {
  await s.addDevice({ deviceId: "dev-1", accountId: "admin", name: "Volet", firmware: "openprofalux" });
  assert.equal(await s.countDevices("admin"), 1);
  assert.equal((await s.listDevices("admin")).length, 1);
  assert.ok(await s.findDevice("dev-1", "admin"));
  assert.equal(await s.findDevice("dev-1", "autre-compte"), null);
});
test("device : renommer n'affecte que le device du bon compte", async () => {
  await s.addDevice({ deviceId: "dev-2", accountId: "admin", name: "Avant", firmware: "openprofalux" });
  await s.renameDevice("dev-2", "autre-compte", "Pirate");   // mauvais compte : no-op
  assert.equal((await s.findDevice("dev-2", "admin"))?.name, "Avant");
  await s.renameDevice("dev-2", "admin", "Après");
  assert.equal((await s.findDevice("dev-2", "admin"))?.name, "Après");
});
test("device : supprimer n'affecte que le device du bon compte", async () => {
  await s.addDevice({ deviceId: "dev-3", accountId: "admin", name: "X", firmware: "openprofalux" });
  await s.removeDevice("dev-3", "autre-compte");             // mauvais compte : no-op
  assert.ok(await s.findDevice("dev-3", "admin"));
  await s.removeDevice("dev-3", "admin");
  assert.equal(await s.findDevice("dev-3", "admin"), null);
});
test("ensureAccount : provisionne au plafond donné, idempotent", async () => {
  await s.ensureAccount("sso-user", 5);
  assert.equal((await s.getAccount("sso-user"))?.deviceCap, 5);
  await s.ensureAccount("sso-user", 99);   // ne réécrit pas un compte existant
  assert.equal((await s.getAccount("sso-user"))?.deviceCap, 5);
});
test("comptes : admin semé est opérateur ; createAccount crée un utilisateur simple", async () => {
  assert.equal((await s.getAccount("admin"))?.admin, true);
  await s.createAccount("alice", "SEL:H", 3, false);
  const a = await s.getAccount("alice");
  assert.equal(a?.admin, false);
  assert.equal(a?.deviceCap, 3);
});
test("comptes : listAccounts rend les comptes, opérateur en tête", async () => {
  const ids = (await s.listAccounts()).map((a) => a.id);
  assert.ok(ids.includes("admin") && ids.includes("alice"));
  assert.equal((await s.listAccounts())[0]?.admin, true);
});
test("comptes : removeAccount supprime le compte ET ses appareils", async () => {
  await s.createAccount("bob", "SEL:H", 5, false);
  await s.addDevice({ deviceId: "bob-dev", accountId: "bob", name: "V", firmware: "openprofalux" });
  assert.equal(await s.countDevices("bob"), 1);
  await s.removeAccount("bob");
  assert.equal(await s.getAccount("bob"), null);
  assert.equal(await s.countDevices("bob"), 0);
});
test("claimDevice : ré-enrôlement du même compte OK, autre compte refusé", async () => {
  assert.equal(await s.claimDevice("dev-claim", "admin", "N1", "openprofalux"), true);
  assert.equal(await s.claimDevice("dev-claim", "admin", "N2", "openprofalux"), true);   // ré-enrôlement : met à jour
  assert.equal((await s.findDevice("dev-claim", "admin"))?.name, "N2");
  assert.equal(await s.claimDevice("dev-claim", "autre", "Pirate", "openprofalux"), false); // autre compte : refus
  assert.equal((await s.findDevice("dev-claim", "admin"))?.name, "N2");
});
test("device-auth : pending -> approved -> consumed, une seule fois", async () => {
  const future = Date.now() + 60000;
  await s.startDeviceAuth({ deviceCode: "DC1", userCode: "UC1", deviceId: "m5-1", firmware: "openprofalux", state: "pending", accountId: null, name: null, expiresAt: future });
  assert.equal((await s.pollDeviceAuth("DC1"))?.state, "pending");
  assert.equal((await s.getDeviceAuthByUserCode("UC1"))?.deviceId, "m5-1");
  assert.equal((await s.approveDeviceAuth("UC1", "admin", "Maison", Date.now()))?.state, "approved");
  assert.equal(await s.approveDeviceAuth("UC1", "admin", "Maison", Date.now()), null); // déjà approuvé
  const taken = await s.consumeDeviceAuth("DC1", Date.now());
  assert.equal(taken?.accountId, "admin");
  assert.equal(taken?.name, "Maison");
  assert.equal(await s.consumeDeviceAuth("DC1", Date.now()), null); // déjà consommé
});
test("device-auth : nom vide retombe sur le deviceId", async () => {
  const future = Date.now() + 60000;
  await s.startDeviceAuth({ deviceCode: "DC2", userCode: "UC2", deviceId: "m5-2", firmware: "openprofalux", state: "pending", accountId: null, name: null, expiresAt: future });
  assert.equal((await s.approveDeviceAuth("UC2", "admin", "  ", Date.now()))?.name, "m5-2");
});
test("device-auth : la purge retire les demandes expirées et garde les autres", async () => {
  await s.startDeviceAuth({ deviceCode: "DCP1", userCode: "UCP1", deviceId: "m5-p1", firmware: "openprofalux", state: "pending", accountId: null, name: null, expiresAt: Date.now() - 1000 });
  await s.startDeviceAuth({ deviceCode: "DCP2", userCode: "UCP2", deviceId: "m5-p2", firmware: "openprofalux", state: "pending", accountId: null, name: null, expiresAt: Date.now() + 60000 });
  assert.ok((await s.purgeExpiredDeviceAuth(Date.now())) >= 1);
  assert.equal(await s.pollDeviceAuth("DCP1"), null);
  assert.equal((await s.pollDeviceAuth("DCP2"))?.state, "pending");
});
test("device-auth : une demande expirée n'est pas approuvable", async () => {
  await s.startDeviceAuth({ deviceCode: "DC3", userCode: "UC3", deviceId: "m5-3", firmware: "openprofalux", state: "pending", accountId: null, name: null, expiresAt: Date.now() - 1 });
  assert.equal(await s.approveDeviceAuth("UC3", "admin", "X", Date.now()), null);
});
