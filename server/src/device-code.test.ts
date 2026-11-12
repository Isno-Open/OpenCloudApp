import { test } from "node:test";
import assert from "node:assert/strict";
import { newUserCode, newDeviceCode, normalizeUserCode, displayUserCode, USER_CODE_ALPHABET, USER_CODE_LENGTH } from "./device-code.js";

test("user_code : longueur et alphabet sans caractère ambigu", () => {
  for (let i = 0; i < 200; i++) {
    const c = newUserCode();
    assert.equal(c.length, USER_CODE_LENGTH);
    for (const ch of c) assert.ok(USER_CODE_ALPHABET.includes(ch), `caractère hors alphabet : ${ch}`);
  }
  for (const amb of ["0", "O", "1", "I", "L"]) assert.ok(!USER_CODE_ALPHABET.includes(amb), `ambigu présent : ${amb}`);
});
test("device_code : secret long, distinct à chaque appel", () => {
  const a = newDeviceCode(), b = newDeviceCode();
  assert.equal(a.length, 64);
  assert.notEqual(a, b);
});
test("normalisation : tiret, espaces et minuscules acceptés ; mauvaise longueur refusée", () => {
  assert.equal(normalizeUserCode("abcd-ef23"), "ABCDEF23");
  assert.equal(normalizeUserCode(" ABCD EF23 "), "ABCDEF23");
  assert.equal(normalizeUserCode("ABCD-EF2"), null);
  assert.equal(normalizeUserCode(""), null);
});
test("affichage : XXXX-XXXX, et aller-retour avec la normalisation", () => {
  const c = newUserCode();
  assert.equal(displayUserCode(c), `${c.slice(0, 4)}-${c.slice(4)}`);
  assert.equal(normalizeUserCode(displayUserCode(c)), c);
});
