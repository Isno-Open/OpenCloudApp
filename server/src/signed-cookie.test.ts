import { test } from "node:test";
import assert from "node:assert/strict";
import { makeSignedSession, readSignedSession, cookieValue } from "./signed-cookie.js";

const S = "secret-de-test";
const NOW = 1_000_000;

test("valeur signee intacte et non expiree : l'e-mail", () => {
  assert.equal(readSignedSession(makeSignedSession("bob@exemple.fr", S, NOW + 1000), S, NOW), "bob@exemple.fr");
});
test("autre secret, expiree, alteree, mal formee, sans secret : null", () => {
  const v = makeSignedSession("bob@exemple.fr", S, NOW + 1000);
  assert.equal(readSignedSession(makeSignedSession("bob@exemple.fr", "autre", NOW + 1000), S, NOW), null);
  assert.equal(readSignedSession(makeSignedSession("bob@exemple.fr", S, NOW - 1), S, NOW), null);
  assert.equal(readSignedSession(v.replace(/^./, "x"), S, NOW), null);
  assert.equal(readSignedSession("a.b", S, NOW), null);
  assert.equal(readSignedSession(v, "", NOW), null);
});
test("cookie : lu par son nom exact", () => {
  assert.equal(cookieValue("a=1; isno_account=x%2Ey; b=2", "isno_account"), "x.y");
  assert.equal(cookieValue("xisno_account=1", "isno_account"), null);
});
