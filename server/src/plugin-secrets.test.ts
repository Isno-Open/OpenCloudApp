import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, statSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensurePluginSecret, storedPluginSecret } from "./plugin-secrets.js";

test("secret de plugin : cree une fois, garde ensuite, propre a chaque plugin, fichier en 600", () => {
  const dir = mkdtempSync(join(tmpdir(), "psec-"));
  assert.equal(storedPluginSecret("a", dir), null);
  const a1 = ensurePluginSecret("a", dir);
  assert.ok(a1.length >= 40);
  assert.equal(ensurePluginSecret("a", dir), a1, "jamais regenere");
  assert.equal(storedPluginSecret("a", dir), a1);
  assert.notEqual(ensurePluginSecret("b", dir), a1);
  assert.equal(ensurePluginSecret("a", dir), a1, "un autre plugin ne l'ecrase pas");
  assert.equal(statSync(join(dir, "plugin-secrets.json")).mode & 0o777, 0o600);
});
