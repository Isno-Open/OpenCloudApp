import { test } from "node:test";
import assert from "node:assert/strict";
import { validateCatalog, containerCreateBody, substitute, splitImage, loadCatalog, MANAGED_LABEL, MODULE_LABEL } from "./catalog.js";
import { PullProgress } from "./progress.js";

const ok = { title: "MongoDB", image: "mongo:9.0.8", container: "isno-mongo", volumes: { "isno-mongo-data": "/data/db" } };

test("catalogue : le modules.json livre est valide", () => {
  const c = loadCatalog(new URL("../modules.json", import.meta.url).pathname);
  assert.ok(c.mongo);
  assert.equal(c.mongo.endpoint, "mongodb://isno-mongo:27017");
});
test("catalogue : un chemin de l'hote est refuse (seuls les volumes nommes)", () => {
  assert.throws(() => validateCatalog({ mod: { ...ok, volumes: { "/var/run": "/host" } } }), /NOMMES/);
  assert.throws(() => validateCatalog({ mod: { ...ok, volumes: { "../etc": "/e" } } }), /NOMMES/);
});
test("catalogue : image sans version exacte ou en latest refusee", () => {
  assert.throws(() => validateCatalog({ mod: { ...ok, image: "mongo" } }), /version exacte/);
  assert.throws(() => validateCatalog({ mod: { ...ok, image: "mongo:latest" } }), /version exacte/);
});
test("catalogue : identifiant et champs requis", () => {
  assert.throws(() => validateCatalog({ "Mauvais Id": ok }), /identifiant invalide/);
  assert.throws(() => validateCatalog({ mod: { title: "t", image: "mongo:9.0.8" } }), /requis/);
  assert.deepEqual(Object.keys(validateCatalog({ $comment: "c", mod: ok })), ["mod"]);   // commentaires ignores
});
test("ordre Docker : etiquettes du superviseur, volumes nommes, jamais privilegie, reseau de la pile", () => {
  const b = containerCreateBody("mongo", { ...ok, command: ["--cache", "${MONGO_CACHE_GB:-0.25}"] }, "isno-cloud-net", {});
  assert.equal(b.Labels[MANAGED_LABEL], "true");
  assert.equal(b.Labels[MODULE_LABEL], "mongo");
  assert.deepEqual(b.HostConfig.Binds, ["isno-mongo-data:/data/db"]);
  assert.equal(b.HostConfig.Privileged, false);
  assert.equal(b.HostConfig.NetworkMode, "isno-cloud-net");
  assert.deepEqual(b.Cmd, ["--cache", "0.25"]);
});
test("substitution : variable presente, defaut, et rien d'autre", () => {
  assert.equal(substitute("${A:-1}", { A: "2" }), "2");
  assert.equal(substitute("${A:-1}", {}), "1");
  assert.equal(substitute("$(rm -rf /) ${a}", { a: "x" }), "$(rm -rf /) ${a}");   // pas d'evaluation, minuscules ignorees
});
test("image : separation nom / version, registre compris", () => {
  assert.deepEqual(splitImage("mongo:9.0.8"), { fromImage: "mongo", tag: "9.0.8" });
  assert.deepEqual(splitImage("registry.isno.fr/x/app:1.2"), { fromImage: "registry.isno.fr/x/app", tag: "1.2" });
});
test("progression : agregee sur les couches, 100 reserve au demarrage", () => {
  const p = new PullProgress();
  p.feed({ id: "a", status: "Pulling fs layer" }); p.feed({ id: "b", status: "Pulling fs layer" });
  assert.equal(p.percent(), 0);
  p.feed({ id: "a", status: "Downloading", progressDetail: { current: 50, total: 100 } });
  p.feed({ id: "b", status: "Downloading", progressDetail: { current: 0, total: 300 } });
  assert.equal(p.percent(), 12);
  p.feed({ id: "a", status: "Pull complete" }); p.feed({ id: "b", status: "Pull complete" });
  assert.equal(p.percent(), 99);
  const q = new PullProgress(); q.feed({ id: "a", status: "Already exists" }); assert.equal(q.percent(), 99);
});
