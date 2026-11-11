import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, cmdTopic, cmdPayload, applyCoverMessage, type Cover } from "./mqtt.js";

test("le topic cible device + cover (namespace de l'ACL)", () => {
  assert.equal(cmdTopic("opf-1", "salon"), "openprofalux/opf-1/cover/salon/set");
});
test("UP/STOP/DOWN -> OPEN/STOP/CLOSE", () => {
  assert.equal(cmdPayload("UP"), "OPEN");
  assert.equal(cmdPayload("STOP"), "STOP");
  assert.equal(cmdPayload("DOWN"), "CLOSE");
});
test("ACTIONS = exactement les trois actions", () => {
  assert.deepEqual(Object.keys(ACTIONS).sort(), ["DOWN", "STOP", "UP"]);
});

const covers = (): Map<string, Map<string, Cover>> => new Map();
test("attrs : le cover prend le type et les libellés déclarés par le device", () => {
  const c = covers();
  applyCoverMessage(c, "openprofalux/dev1/cover/portail/attrs",
    JSON.stringify({ type: "portail", positional: false, up: "Ouvrir", stop: "Stop", down: "Fermer" }));
  const cov = c.get("dev1")!.get("portail")!;
  assert.equal(cov.type, "portail");
  assert.equal(cov.positional, false);
  assert.equal(cov.up, "Ouvrir");
  assert.equal(cov.down, "Fermer");
});
test("state et position se posent sur le bon cover", () => {
  const c = covers();
  applyCoverMessage(c, "openprofalux/dev1/cover/salon/state", "open");
  applyCoverMessage(c, "openprofalux/dev1/cover/salon/position", "45");
  const cov = c.get("dev1")!.get("salon")!;
  assert.equal(cov.state, "open");
  assert.equal(cov.position, 45);
});
test("un topic hors forme est ignoré (pas de cover fantôme)", () => {
  const c = covers();
  applyCoverMessage(c, "homeassistant/cover/x/config", "{}");
  applyCoverMessage(c, "openprofalux/dev1/listen/state", "ON");
  assert.equal(c.size, 0);
});
test("attrs non-JSON n'explose pas et ne corrompt pas le cover", () => {
  const c = covers();
  applyCoverMessage(c, "openprofalux/dev1/cover/salon/attrs", "pas du json");
  assert.ok(c.get("dev1")!.get("salon"));   // cover créé, valeurs par défaut
});
