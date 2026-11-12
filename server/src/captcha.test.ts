import { test } from "node:test";
import assert from "node:assert/strict";
import { newChallenge, verifyCaptcha, captchaSvg, CAPTCHA_TTL_MS } from "./captcha.js";
const KEY = "cle-de-test";

test("captcha : bonne reponse acceptee (casse indifferente), mauvaise refusee", () => {
  const { code, token } = newChallenge(KEY);
  assert.equal(verifyCaptcha(token, code.toLowerCase(), KEY), true);
  assert.equal(verifyCaptcha(token, "ZZZZZ", KEY), false);
});
test("captcha : la reponse n'est pas dans le jeton", () => {
  const { code, token } = newChallenge(KEY);
  assert.equal(token.includes(code), false);
});
test("captcha : expire, falsifie ou signe d'une autre cle => refuse", () => {
  const now = Date.now();
  const { code, token } = newChallenge(KEY, now);
  assert.equal(verifyCaptcha(token, code, KEY, now + CAPTCHA_TTL_MS + 1), false);
  assert.equal(verifyCaptcha(token.replace(/\.(\d+)\./, ".9999999999999."), code, KEY), false);
  assert.equal(verifyCaptcha(token, code, "autre-cle"), false);
});
test("captcha : le dessin contient bien chaque lettre", () => {
  const svg = captchaSvg("AB2CD");
  for (const ch of "AB2CD") assert.ok(svg.includes(`>${ch}</text>`));
});
