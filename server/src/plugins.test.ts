import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
process.env.DB_PATH = join(mkdtempSync(join(tmpdir(), "isno-plug-")), "t.db");
process.env.HARNESS_MODULE = "";
const { loadPlugins, installedPlugins, hasCapability, CAPABILITY, DEFAULT_PLUGINS } = await import("./plugins.js");
const { authProviders } = await import("./auth-provider.js");

test("par defaut : « Connexion par mot de passe » installe ; connexion native du coeur + creation de comptes par le plugin", async () => {
  assert.deepEqual([...DEFAULT_PLUGINS], ["local-accounts"]);
  await loadPlugins();
  assert.deepEqual(installedPlugins().map((p) => [p.id, p.builtin]), [["local-accounts", true]]);
  assert.equal(hasCapability(CAPABILITY.localLogin), true);
  assert.equal(hasCapability(CAPABILITY.accountCreation), true);
  assert.deepEqual(authProviders().map((p) => p.id), ["local"]);
});
test("chargement unique : rappeler loadPlugins n'installe rien en double", async () => {
  await loadPlugins();
  assert.equal(installedPlugins().length, 1);
  assert.equal(authProviders().length, 1);
});

test("connexion : categorie a choix unique ; en activer une eteint l'autre, pas le reste", async () => {
  const { withPluginOnExclusive, enabledIn } = await import("./plugins.js");
  const start = { plugins: ["local-accounts", "installable-app"] };
  const on = await withPluginOnExclusive(start, "external-auth");
  assert.deepEqual(on.turnedOff, ["local-accounts"]);
  const active = enabledIn(on.cfg);
  assert.ok(active.includes("external-auth") && !active.includes("local-accounts"));
  assert.ok(active.includes("installable-app"), "une autre categorie n'est pas touchee");
  const back = await withPluginOnExclusive(on.cfg, "local-accounts");
  assert.deepEqual(back.turnedOff, ["external-auth"]);
  const themes = await withPluginOnExclusive(start, "theme-custom");
  assert.deepEqual(themes.turnedOff, [], "apparence : pas exclusive (le theme ISNO reste toujours actif)");
});
