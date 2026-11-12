import { test } from "node:test";
import assert from "node:assert/strict";
import { makeAccountToken, readAccountToken, peekAccountToken, ACCOUNT_TOKEN, ACCOUNT_TOKEN_TTL_MS } from "./account-token.js";
const K = "cle";
const db = new Map<string, string | null>([["bob@x.fr", "SEL:H1"], ["neuf@x.fr", null]]);
const cur = (id: string) => (db.has(id) ? db.get(id)! : undefined);

test("jeton : valide pour son usage et son compte", () => {
  const t = makeAccountToken(K, ACCOUNT_TOKEN.reset, "bob@x.fr", "SEL:H1");
  assert.equal(readAccountToken(K, t, ACCOUNT_TOKEN.reset, cur), "bob@x.fr");
});
test("jeton : un autre usage, une autre cle, ou falsifie => refuse", () => {
  const t = makeAccountToken(K, ACCOUNT_TOKEN.reset, "bob@x.fr", "SEL:H1");
  assert.equal(readAccountToken(K, t, ACCOUNT_TOKEN.invite, cur), null);
  assert.equal(readAccountToken("autre", t, ACCOUNT_TOKEN.reset, cur), null);
  const [b, s] = t.split(".");
  const forged = Buffer.from(Buffer.from(b!, "base64url").toString().replace("bob", "eve")).toString("base64url");
  assert.equal(readAccountToken(K, `${forged}.${s}`, ACCOUNT_TOKEN.reset, cur), null);
});
test("jeton : expire", () => {
  const now = Date.now();
  const t = makeAccountToken(K, ACCOUNT_TOKEN.reset, "bob@x.fr", "SEL:H1", now);
  assert.equal(readAccountToken(K, t, ACCOUNT_TOKEN.reset, cur, now + ACCOUNT_TOKEN_TTL_MS.reset + 1), null);
});
test("usage unique : le mot de passe a change depuis l'emission => lien perime", () => {
  const t = makeAccountToken(K, ACCOUNT_TOKEN.reset, "bob@x.fr", "SEL:H1");
  db.set("bob@x.fr", "SEL:H2");
  assert.equal(readAccountToken(K, t, ACCOUNT_TOKEN.reset, cur), null);
});
test("invitation : compte sans mot de passe, puis perimee une fois le mot de passe choisi", () => {
  const t = makeAccountToken(K, ACCOUNT_TOKEN.invite, "neuf@x.fr", null);
  assert.equal(readAccountToken(K, t, ACCOUNT_TOKEN.invite, cur), "neuf@x.fr");
  db.set("neuf@x.fr", "SEL:CHOISI");
  assert.equal(readAccountToken(K, t, ACCOUNT_TOKEN.invite, cur), null);
});
test("compte inconnu => refuse", () => {
  assert.equal(readAccountToken(K, makeAccountToken(K, ACCOUNT_TOKEN.reset, "x@x.fr", "S"), ACCOUNT_TOKEN.reset, cur), null);
});
test("lecture prealable : compte vise si signature, usage et date sont bons", () => {
  const t = makeAccountToken(K, ACCOUNT_TOKEN.invite, "zoe@x.fr", null);
  assert.equal(peekAccountToken(K, t, ACCOUNT_TOKEN.invite), "zoe@x.fr");
  assert.equal(peekAccountToken(K, t, ACCOUNT_TOKEN.reset), null);
  assert.equal(peekAccountToken("autre", t, ACCOUNT_TOKEN.invite), null);
});
