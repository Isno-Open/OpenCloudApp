import { test } from "node:test";
import assert from "node:assert/strict";
process.env.SESSION_SECRET = "secret-de-test";
process.env.SSO_SECRET = "sso-secret-de-test";
const { makeSession, readSession, makeSsoToken, readSsoSession } = await import("./session.js");

test("aller-retour : un cookie signé redonne le compte", () => {
  assert.equal(readSession(`sid=${encodeURIComponent(makeSession("alice"))}`), "alice");
});
test("pas de cookie => null", () => { assert.equal(readSession(undefined), null); });
test("identité falsifiée (mac invalide) => null", () => {
  const forge = makeSession("alice").replace("alice", "admin");
  assert.equal(readSession(`sid=${encodeURIComponent(forge)}`), null);
});
test("SSO : un jeton signé du site redonne le compte", () => {
  assert.equal(readSsoSession(`sso=${encodeURIComponent(makeSsoToken("bob"))}`), "bob");
});
test("SSO : jeton falsifié => null", () => {
  const t = makeSsoToken("bob").replace("bob", "boss");
  assert.equal(readSsoSession(`sso=${encodeURIComponent(t)}`), null);
});
test("SSO : un sid (autre secret) n'est pas accepté comme sso", () => {
  assert.equal(readSsoSession(`sso=${encodeURIComponent(makeSession("alice"))}`), null);
});
