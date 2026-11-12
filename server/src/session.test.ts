import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SESSION_SECRET = "secret-de-test";
const { makeSession, readSession, makePending, readPending, PENDING_TTL_MS } = await import("./session.js");

test("aller-retour : un cookie signé redonne le compte", () => {
  assert.equal(readSession(`sid=${encodeURIComponent(makeSession("alice"))}`), "alice");
});
test("pas de cookie => null", () => { assert.equal(readSession(undefined), null); });
test("identité falsifiée (mac invalide) => null", () => {
  const forge = makeSession("alice").replace("alice", "admin");
  assert.equal(readSession(`sid=${encodeURIComponent(forge)}`), null);
});

test("connexion en attente (double authentification) : valide, puis expiree", () => {
  const now = Date.now();
  const t = makePending("alice@x.fr", now);
  assert.equal(readPending(`pending=${encodeURIComponent(t)}`, now), "alice@x.fr");
  assert.equal(readPending(`pending=${encodeURIComponent(t)}`, now + PENDING_TTL_MS + 1), null);
});
test("connexion en attente : falsifiee refusee, et une session n'en tient jamais lieu (ni l'inverse)", () => {
  const t = makePending("alice@x.fr");
  assert.equal(readPending(`pending=${encodeURIComponent(t.replace("alice", "mallory"))}`), null);
  assert.equal(readPending(`pending=${encodeURIComponent(makeSession("alice@x.fr"))}`), null);
  assert.equal(readSession(`sid=${encodeURIComponent(t)}`), null);
});
