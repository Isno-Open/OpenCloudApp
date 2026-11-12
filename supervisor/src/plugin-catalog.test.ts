import { test } from "node:test";
import assert from "node:assert/strict";
import { validatePluginCatalog, copyContainerBody, PLUGIN_ACTION, PLUGINS_VOLUME } from "./plugin-catalog.js";
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
