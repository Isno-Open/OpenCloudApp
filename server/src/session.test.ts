import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SESSION_SECRET = "secret-de-test";
const { makeSession, readSession } = await import("./session.js");

test("aller-retour : un cookie signé redonne le compte", () => {
  assert.equal(readSession(`sid=${encodeURIComponent(makeSession("alice"))}`), "alice");
});
test("pas de cookie => null", () => {
  assert.equal(readSession(undefined), null);
});
test("identité falsifiée (mac invalide) => null", () => {
  const cookie = makeSession("alice");                 // alice.<mac(alice)>
  const forge = cookie.replace("alice", "admin");      // admin.<mac(alice)> : mac ne correspond plus
  assert.equal(readSession(`sid=${encodeURIComponent(forge)}`), null);
});
