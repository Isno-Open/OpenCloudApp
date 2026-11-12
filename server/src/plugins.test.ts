import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "isno-plug-")), "t.db");
process.env.HARNESS_MODULE = "";
const { loadPlugins, installedPlugins, hasCapability, CAPABILITY, DEFAULT_PLUGINS } = await import("./plugins.js");
const { authProviders } = await import("./auth-provider.js");

test("par defaut : le greffon « comptes locaux » est installe et fournit connexion + gestion des comptes", async () => {
  assert.deepEqual([...DEFAULT_PLUGINS], ["local-accounts"]);
  await loadPlugins();
  assert.deepEqual(installedPlugins().map((p) => [p.id, p.builtin]), [["local-accounts", true]]);
  assert.equal(hasCapability(CAPABILITY.localLogin), true);
  assert.equal(hasCapability(CAPABILITY.userAdmin), true);
  assert.deepEqual(authProviders().map((p) => p.id), ["local"]);
});
test("chargement unique : rappeler loadPlugins n'installe rien en double", async () => {
  await loadPlugins();
  assert.equal(installedPlugins().length, 1);
  assert.equal(authProviders().length, 1);
});
