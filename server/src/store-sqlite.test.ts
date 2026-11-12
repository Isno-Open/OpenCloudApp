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
