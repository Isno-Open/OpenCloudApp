import { test } from "node:test";
import assert from "node:assert/strict";
import { hotp, verifyTotp, base32Encode, base32Decode, newTotpSecret, totpStep } from "./totp.js";

// Vecteurs officiels RFC 6238 (annexe B), SHA1, secret ASCII "12345678901234567890", 8 chiffres.
const SECRET = Buffer.from("12345678901234567890");
const RFC: [number, string][] = [[59, "94287082"], [1111111109, "07081804"], [1111111111, "14050471"],
  [1234567890, "89005924"], [2000000000, "69279037"], [20000000000, "65353130"]];

test("TOTP : vecteurs officiels de la RFC 6238 (SHA1, 8 chiffres)", () => {
  for (const [t, want] of RFC) assert.equal(hotp(SECRET, Math.floor(t / 30), 8), want, `t=${t}`);
});
test("base32 : aller-retour, et vecteur de la RFC 4648", () => {
  assert.equal(base32Encode(Buffer.from("foobar")), "MZXW6YTBOI");
  const s = newTotpSecret();
  assert.equal(base32Encode(base32Decode(s)), s);
  assert.equal(base32Decode(s).length, 20);
});
test("verification : code courant accepte, code faux ou mal forme refuse", () => {
  const s = base32Encode(SECRET), now = 1111111111 * 1000;
  const code = hotp(SECRET, totpStep(now));
  assert.equal(verifyTotp(s, code, now), totpStep(now));
  assert.equal(verifyTotp(s, "000000", now), null);
  assert.equal(verifyTotp(s, "12345", now), null);
});
test("verification : un pas de decalage tolere, deux refuses", () => {
  const s = base32Encode(SECRET), now = 1111111111 * 1000;
  assert.notEqual(verifyTotp(s, hotp(SECRET, totpStep(now) - 1), now), null);
  assert.equal(verifyTotp(s, hotp(SECRET, totpStep(now) - 2), now), null);
});
test("rejeu : un code deja utilise est refuse", () => {
  const s = base32Encode(SECRET), now = 1111111111 * 1000;
  const step = verifyTotp(s, hotp(SECRET, totpStep(now)), now)!;
  assert.equal(verifyTotp(s, hotp(SECRET, totpStep(now)), now, step), null);
});
