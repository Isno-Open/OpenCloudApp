import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePluginCatalog, copyContainerBody, mergeCatalogs, isSourceUrl, ISNO_SOURCE, PLUGIN_ACTION, PLUGINS_VOLUME } from "./plugin-catalog.js";
import { MANAGED_LABEL } from "./catalog.js";
const ok = { title: "Exemple", description: { fr: "f", en: "e" }, image: "ghcr.io/x/plugin:1.0.0" };

test("catalogue des plugins : entree valide acceptee, commentaires ignores", () => {
  assert.deepEqual(Object.keys(validatePluginCatalog({ $comment: "x", example: ok })), ["example"]);
});
test("catalogue des plugins : identifiant qui sortirait du volume refuse", () => {
  for (const id of ["../etc", "a/b", "A", "x;rm"]) assert.throws(() => validatePluginCatalog({ [id]: ok }), /identifiant/);
});
test("catalogue des plugins : image sans version exacte refusee", () => {
  assert.throws(() => validatePluginCatalog({ example: { ...ok, image: "x/plugin:latest" } }), /version exacte/);
  assert.throws(() => validatePluginCatalog({ example: { ...ok, image: "x/plugin" } }), /version exacte/);
});
test("catalogue des plugins : description dans les deux langues exigee", () => {
  assert.throws(() => validatePluginCatalog({ example: { ...ok, description: { fr: "f" } } }), /description/);
});
test("conteneur de copie : sans reseau, non privilegie, seul le volume des plugins, etiquete", () => {
  const b = copyContainerBody("example", ok.image, PLUGIN_ACTION.install);
  assert.equal(b.HostConfig.NetworkMode, "none");
  assert.equal(b.HostConfig.Privileged, false);
  assert.deepEqual(b.HostConfig.Binds, [`${PLUGINS_VOLUME}:/out`]);
  assert.equal(b.Labels[MANAGED_LABEL], "true");
  assert.match(b.Cmd[0]!, /\/out\/example/);
});
test("conteneur de copie : identifiant invalide refuse meme hors catalogue", () => {
  assert.throws(() => copyContainerBody("../x", ok.image, PLUGIN_ACTION.remove), /invalide/);
});
test("sources : une source ajoutee ne remplace jamais un plugin ISNO", () => {
  const m = mergeCatalogs({ example: ok }, [{ source: "https://tiers.example/c.json", raw: { example: { ...ok, image: "tiers/piege:1.0.0" }, autre: ok } }]);
  assert.equal(m.plugins.example!.image, ok.image);
  assert.equal(m.sourceOf.example, ISNO_SOURCE);
  assert.equal(m.sourceOf.autre, "https://tiers.example/c.json");
  assert.equal(m.errors.length, 1);
  assert.equal(m.errors[0]!.unreadable, false);   // la source reste utilisable
});
test("sources : un catalogue invalide est signale, sans casser les autres", () => {
  const m = mergeCatalogs({}, [{ source: "a", raw: { "../x": ok } }, { source: "b", raw: { bon: ok } }]);
  assert.deepEqual(Object.keys(m.plugins), ["bon"]);
  assert.equal(m.errors[0]!.source, "a");
  assert.equal(m.errors[0]!.unreadable, true);
});
test("sources : https seulement", () => {
  assert.equal(isSourceUrl("https://exemple.fr/plugins.json"), true);
  for (const u of ["http://exemple.fr/p.json", "file:///etc/passwd", "pas une url"]) assert.equal(isSourceUrl(u), false);
});

test("catalogue local relu a chaque appel, illisible = erreur de source, pas d'arret", async () => {
  const { mkdtempSync, writeFileSync } = await import("node:fs");
  const { join } = await import("node:path");
  const { tmpdir } = await import("node:os");
  const { readLocalCatalog, LOCAL_SOURCE } = await import("./plugin-catalog.js");
  const f = join(mkdtempSync(join(tmpdir(), "cat-")), "plugins.json");
  writeFileSync(f, JSON.stringify({ a: { image: "img:0.1.0" } }));
  assert.deepEqual(readLocalCatalog(f).raws, [{ source: LOCAL_SOURCE, raw: { a: { image: "img:0.1.0" } } }]);
  writeFileSync(f, JSON.stringify({ a: { image: "img:0.2.0" } }));
  assert.deepEqual(readLocalCatalog(f).raws[0]?.raw, { a: { image: "img:0.2.0" } });
  writeFileSync(f, "{ pas du json");
  const bad = readLocalCatalog(f);
  assert.deepEqual(bad.raws, []);
  assert.equal(bad.errors[0]?.unreadable, true);
  assert.deepEqual(readLocalCatalog(""), { raws: [], errors: [] });
});

test("mise a jour : decidee par l'image installee contre celle du catalogue", async () => {
  const { updateInfo } = await import("./plugin-catalog.js");
  assert.deepEqual(updateInfo("p:0.2.0", { present: true, image: "p:0.1.0" }), { version: "0.2.0", installedVersion: "0.1.0", updateAvailable: true });
  assert.deepEqual(updateInfo("p:0.2.0", { present: true, image: "p:0.2.0" }), { version: "0.2.0", installedVersion: "0.2.0", updateAvailable: false });
  assert.deepEqual(updateInfo("p:0.2.0", { present: true, image: null }), { version: "0.2.0", installedVersion: null, updateAvailable: true });
  assert.deepEqual(updateInfo("p:0.2.0", { present: false, image: null }), { version: "0.2.0", installedVersion: null, updateAvailable: false });
});

test("installation : l'etiquette de l'image installee est posee, une image hors format refusee", async () => {
  const { copyContainerBody, INSTALLED_IMAGE_FILE } = await import("./plugin-catalog.js");
  const body = copyContainerBody("abc", "reg/p:1.2.3", "install");
  assert.ok(body.Cmd[0]!.includes(`printf '%s' 'reg/p:1.2.3' > /out/abc/${INSTALLED_IMAGE_FILE}`));
  assert.throws(() => copyContainerBody("abc", "p:1'; rm -rf /out; '", "install"));
});
