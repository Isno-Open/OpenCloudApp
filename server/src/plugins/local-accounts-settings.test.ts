import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeLocalAccountsSettings, LOCAL_ACCOUNTS_DEFAULTS, TOTP_POLICY, totpRequiredFor, totpAllowed } from "./local-accounts-settings.js";

test("par defaut : tout desactive, 8 caracteres minimum", () => {
  assert.deepEqual(normalizeLocalAccountsSettings(undefined), LOCAL_ACCOUNTS_DEFAULTS);
});
test("bornes : la longueur minimale ne descend jamais sous 8, le blocage reste raisonnable", () => {
  const s = normalizeLocalAccountsSettings({ passwordMinLength: 3, lockout: { enabled: true, maxFailures: 1, minutes: 99999 } });
  assert.equal(s.passwordMinLength, 8);
  assert.equal(s.lockout.maxFailures, 3);
  assert.equal(s.lockout.minutes, 1440);
});
test("valeurs inconnues ignorees (politique, types)", () => {
  const s = normalizeLocalAccountsSettings({ totp: "partout", captcha: "oui" });
  assert.equal(s.totp, TOTP_POLICY.off);
  assert.equal(s.captcha, false);
});
test("politique de double authentification", () => {
  const ops = normalizeLocalAccountsSettings({ totp: "operators" });
  assert.equal(totpRequiredFor(ops, true), true);
  assert.equal(totpRequiredFor(ops, false), false);
  assert.equal(totpAllowed(ops), true);
  assert.equal(totpRequiredFor(normalizeLocalAccountsSettings({ totp: "all" }), false), true);
  assert.equal(totpAllowed(normalizeLocalAccountsSettings({ totp: "off" })), false);
});

import { LOCAL_ACCOUNTS_SETTINGS as DECL } from "./local-accounts-settings.js";
import { SETTING_KIND } from "../plugin-types.js";
test("ecran declare : chaque champ a une valeur, et l'aller-retour formulaire -> config -> formulaire est stable", () => {
  const form = DECL.toForm(undefined);
  for (const f of DECL.fields) assert.ok(f.key in form, `champ sans valeur : ${f.key}`);
  assert.deepEqual(Object.keys(form).sort(), DECL.fields.map((f) => f.key).sort());
  const edited = { ...form, captcha: true, lockoutEnabled: true, lockoutMaxFailures: 4, totp: "all", passwordMinLength: 14 };
  assert.deepEqual(DECL.toForm(DECL.fromForm(edited)), edited);
});
test("ecran declare : bornes affichees = bornes appliquees", () => {
  for (const f of DECL.fields) {
    if (f.kind !== SETTING_KIND.number) continue;
    const lo = DECL.toForm(DECL.fromForm({ ...DECL.toForm(undefined), [f.key]: f.min - 1000 }))[f.key];
    const hi = DECL.toForm(DECL.fromForm({ ...DECL.toForm(undefined), [f.key]: f.max + 1000 }))[f.key];
    assert.equal(lo, f.min, f.key); assert.equal(hi, f.max, f.key);
  }
});
