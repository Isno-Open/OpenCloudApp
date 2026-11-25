import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGooglePin, judgeGooglePin, GOOGLE_PIN, PIN_VERDICT, type PinAttempts } from "./google-pin-rule.js";
import { hashPass, verifyPass } from "../auth.js";

test("code PIN Google : forme acceptee (chiffres seuls, longueur bornee)", () => {
  assert.equal(normalizeGooglePin(" 1234 "), "1234");
  assert.equal(normalizeGooglePin("12345678"), "12345678");
  for (const bad of ["123", "123456789", "12a4", "", 1234, null, undefined]) assert.equal(normalizeGooglePin(bad), null, String(bad));
});

test("code PIN Google : sans code presente il est demande, juste il ouvre, faux il est redemande", () => {
  const hash = hashPass("4821");
  assert.equal(judgeGooglePin(hash, undefined, undefined, 0, verifyPass).verdict, PIN_VERDICT.needed);
  assert.equal(judgeGooglePin(hash, "", undefined, 0, verifyPass).verdict, PIN_VERDICT.needed, "aucun essai compte tant que rien n'est presente");
  assert.equal(judgeGooglePin(hash, undefined, undefined, 0, verifyPass).attempts, undefined);
  assert.equal(judgeGooglePin(hash, "4821", undefined, 0, verifyPass).verdict, PIN_VERDICT.granted);
  const wrong = judgeGooglePin(hash, "0000", undefined, 0, verifyPass);
  assert.equal(wrong.verdict, PIN_VERDICT.failed);
  assert.deepEqual(wrong.attempts, { failed: 1, lockedUntil: 0 });
});

test("code PIN Google : un compte sans code choisi n'ouvre jamais, quel que soit le code presente", () => {
  assert.equal(judgeGooglePin(null, undefined, undefined, 0, verifyPass).verdict, PIN_VERDICT.needed);
  assert.equal(judgeGooglePin(null, "1234", undefined, 0, verifyPass).verdict, PIN_VERDICT.failed);
});

test("code PIN Google : trop d'essais faux bloquent, meme le bon code, jusqu'a la fin du delai", () => {
  const hash = hashPass("4821");
  let attempts: PinAttempts | undefined;
  for (let i = 0; i < GOOGLE_PIN.maxFailures; i++) {
    const r = judgeGooglePin(hash, "0000", attempts, 1000, verifyPass);
    assert.equal(r.verdict, PIN_VERDICT.failed);
    attempts = r.attempts;
  }
  const until = 1000 + GOOGLE_PIN.lockMinutes * 60_000;
  assert.deepEqual(attempts, { failed: 0, lockedUntil: until });
  assert.equal(judgeGooglePin(hash, "4821", attempts, until - 1, verifyPass).verdict, PIN_VERDICT.locked);
  const after = judgeGooglePin(hash, "4821", attempts, until, verifyPass);
  assert.equal(after.verdict, PIN_VERDICT.granted);
  assert.equal(after.attempts, undefined, "le bon code remet le compteur a zero");
});

test("code PIN Google : le bon code efface les essais faux d'avant", () => {
  const hash = hashPass("4821");
  const one = judgeGooglePin(hash, "0000", undefined, 0, verifyPass).attempts;
  assert.equal(judgeGooglePin(hash, "4821", one, 0, verifyPass).attempts, undefined);
});
