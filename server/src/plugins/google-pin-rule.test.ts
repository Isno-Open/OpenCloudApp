import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeGooglePin, judgeGooglePins, GOOGLE_PIN, PIN_VERDICT, type PinAttempts } from "./google-pin-rule.js";
import { hashPass, verifyPass } from "../auth.js";

const NONE: ReadonlyMap<string, PinAttempts> = new Map();
const judge = (hashes: readonly (string | null)[], given: unknown, attempts = NONE, now = 0) => judgeGooglePins(hashes, given, attempts, now, verifyPass);
const account = hashPass("4821"), gate = hashPass("7733");

test("code PIN Google : forme acceptee (chiffres seuls, longueur bornee)", () => {
  assert.equal(normalizeGooglePin(" 1234 "), "1234");
  assert.equal(normalizeGooglePin("12345678"), "12345678");
  for (const bad of ["123", "123456789", "12a4", "", 1234, null, undefined]) assert.equal(normalizeGooglePin(bad), null, String(bad));
});

test("code PIN Google : sans code presente il est demande, juste il ouvre, faux il est redemande", () => {
  assert.deepEqual(judge([account], undefined).verdicts, [PIN_VERDICT.needed]);
  assert.deepEqual(judge([account], "").verdicts, [PIN_VERDICT.needed]);
  assert.equal(judge([account], undefined).attempts.size, 0, "aucun essai compte tant que rien n'est presente");
  assert.deepEqual(judge([account], "4821").verdicts, [PIN_VERDICT.granted]);
  const wrong = judge([account], "0000");
  assert.deepEqual(wrong.verdicts, [PIN_VERDICT.failed]);
  assert.deepEqual(wrong.attempts.get(account), { failed: 1, lockedUntil: 0 });
});

test("code PIN Google : un appareil sans aucun code n'ouvre jamais, et rien n'est compte", () => {
  assert.deepEqual(judge([null], undefined).verdicts, [PIN_VERDICT.needed]);
  const r = judge([null], "1234");
  assert.deepEqual(r.verdicts, [PIN_VERDICT.failed]);
  assert.equal(r.attempts.size, 0);
});

test("code PIN Google : trop d'essais faux bloquent ce code, meme juste, jusqu'a la fin du delai", () => {
  let attempts = NONE;
  for (let i = 0; i < GOOGLE_PIN.maxFailures; i++) {
    const r = judge([account], "0000", attempts, 1000);
    assert.deepEqual(r.verdicts, [PIN_VERDICT.failed]);
    attempts = r.attempts;
  }
  const until = 1000 + GOOGLE_PIN.lockMinutes * 60_000;
  assert.deepEqual(attempts.get(account), { failed: 0, lockedUntil: until });
  assert.deepEqual(judge([account], "4821", attempts, until - 1).verdicts, [PIN_VERDICT.locked]);
  assert.deepEqual(judge([account], undefined, attempts, until - 1).verdicts, [PIN_VERDICT.locked], "bloque : le code n'est meme pas redemande");
  const after = judge([account], "4821", attempts, until);
  assert.deepEqual(after.verdicts, [PIN_VERDICT.granted]);
  assert.equal(after.attempts.has(account), false, "le bon code remet son compteur a zero");
});

test("code PIN Google par appareil : chaque appareil s'ouvre avec SON code, les autres restent fermes", () => {
  // portail avec code propre, garage sur le code du compte
  const withAccount = judge([gate, account], "4821");
  assert.deepEqual(withAccount.verdicts, [PIN_VERDICT.failed, PIN_VERDICT.granted], "le code du compte n'ouvre pas un portail qui a le sien");
  assert.deepEqual(withAccount.attempts.get(gate), { failed: 1, lockedUntil: 0 });
  assert.equal(withAccount.attempts.has(account), false);
  assert.deepEqual(judge([gate, account], "7733").verdicts, [PIN_VERDICT.granted, PIN_VERDICT.failed]);
});

test("code PIN Google par appareil : reussir avec un code n'efface PAS les essais faux contre un autre", () => {
  // qui connait le code du compte alterne : un essai contre le portail, une ouverture reussie du garage
  let attempts = NONE;
  for (let i = 0; i < GOOGLE_PIN.maxFailures; i++) {
    attempts = judge([gate], "0000", attempts, 1000).attempts;
    const ok = judge([account], "4821", attempts, 1000);
    assert.deepEqual(ok.verdicts, [PIN_VERDICT.granted]);
    attempts = ok.attempts;
  }
  assert.deepEqual(judge([gate], "7733", attempts, 1000).verdicts, [PIN_VERDICT.locked], "le portail est bloque malgre les ouvertures reussies du garage");
  assert.deepEqual(judge([account], "4821", attempts, 1000).verdicts, [PIN_VERDICT.granted], "le blocage d'un code ne bloque pas les autres");
});

test("code PIN Google par appareil : un code faux sur dix portails au meme code compte pour UN essai", () => {
  const r = judge(Array.from({ length: 10 }, () => account), "0000");
  assert.deepEqual(r.attempts.get(account), { failed: 1, lockedUntil: 0 });
  assert.equal(r.verdicts.every((v) => v === PIN_VERDICT.failed), true);
});

test("code PIN Google par appareil : aucun appareil, aucune issue", () => {
  const r = judge([], "4821");
  assert.deepEqual(r.verdicts, []);
  assert.equal(r.attempts.size, 0);
});
