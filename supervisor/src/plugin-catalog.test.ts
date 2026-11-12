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
