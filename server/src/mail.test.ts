import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeSmtp, SMTP_SECURITY } from "./mail.js";

test("SMTP : config complete acceptee, securite par defaut STARTTLS", () => {
  const c = normalizeSmtp({ host: "smtp.exemple.fr", port: 587, fromEmail: "portail@exemple.fr" });
  assert.equal(c?.security, SMTP_SECURITY.starttls);
  assert.equal(c?.user, "");
});
test("SMTP : hote, port ou expediteur invalides => null (fonctions de messagerie masquees)", () => {
  assert.equal(normalizeSmtp({ host: "", port: 587, fromEmail: "a@b.fr" }), null);
  assert.equal(normalizeSmtp({ host: "smtp.x.fr", port: 99999, fromEmail: "a@b.fr" }), null);
  assert.equal(normalizeSmtp({ host: "smtp.x.fr", port: 587, fromEmail: "pas-un-mail" }), null);
  assert.equal(normalizeSmtp({ host: "smtp x;rm", port: 587, fromEmail: "a@b.fr" }), null);
});
