import { test } from "node:test";
import assert from "node:assert/strict";
import { isNewerVersion } from "./version.js";

test("mise a jour proposee seulement vers plus recent", () => {
  assert.equal(isNewerVersion("0.2.16", "0.2.15"), true);
  assert.equal(isNewerVersion("0.3.0", "0.2.99"), true);
  assert.equal(isNewerVersion("1.0.0", "0.9.9"), true);
  assert.equal(isNewerVersion("v0.2.16", "0.2.15"), true, "prefixe v des etiquettes GitHub");
});
test("jamais vers plus ancien, ni vers la meme", () => {
  assert.equal(isNewerVersion("0.2.15", "0.2.16-cloudfinaltest"), false, "cas reel du M5, 2026-11-14");
  assert.equal(isNewerVersion("0.2.15", "0.2.16"), false);
  assert.equal(isNewerVersion("0.2.16", "0.2.16"), false);
  assert.equal(isNewerVersion("0.2.9", "0.2.10"), false, "numerique, pas alphabetique");
});
test("pre-versions : la publiee l'emporte sur la pre-version du meme numero, pas l'inverse", () => {
  assert.equal(isNewerVersion("0.2.16", "0.2.16-essai"), true);
  assert.equal(isNewerVersion("0.2.16-essai", "0.2.16"), false);
  assert.equal(isNewerVersion("0.2.16-b", "0.2.16-a"), false, "deux pre-versions : on ne sait pas classer");
});
test("forme inconnue : pas de proposition", () => {
  assert.equal(isNewerVersion("demain", "0.2.15"), false);
  assert.equal(isNewerVersion("0.2.16", ""), false);
});
