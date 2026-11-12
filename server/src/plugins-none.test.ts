import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "isno-plug0-")), "t.db");
process.env.HARNESS_MODULE = "";
const { loadPlugins, installedPlugins, hasCapability, CAPABILITY } = await import("./plugins.js");
const { authProviders } = await import("./auth-provider.js");

test("sans aucun plugin (compte unique) : la connexion reste possible, pas d'ecran Utilisateurs", async () => {
  await loadPlugins([]);
  assert.equal(installedPlugins().length, 0);
  assert.equal(hasCapability(CAPABILITY.localLogin), true);
  assert.equal(hasCapability(CAPABILITY.userAdmin), false);
  assert.deepEqual(authProviders().map((p) => p.id), ["local"]);
});
