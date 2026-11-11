import { test } from "node:test";
import assert from "node:assert/strict";
import { ACTIONS, cmdTopic, cmdPayload } from "./mqtt.js";

test("le topic cible device + volet (namespace de l'ACL)", () => {
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
