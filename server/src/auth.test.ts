import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPass, verifyPass } from "./auth.js";

test("verifyPass accepte le bon mot de passe", () => {
  assert.equal(verifyPass("s3cret", hashPass("s3cret")), true);
});
test("verifyPass refuse un mauvais mot de passe", () => {
  assert.equal(verifyPass("mauvais", hashPass("s3cret")), false);
});
test("verifyPass refuse un hash mal formé", () => {
  assert.equal(verifyPass("x", "pas-de-separateur"), false);
});
test("deux hash du même mot de passe diffèrent (sel aléatoire)", () => {
  assert.notEqual(hashPass("x"), hashPass("x"));
});
