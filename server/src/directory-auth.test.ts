import { test } from "node:test";
import assert from "node:assert/strict";
import { signDirectory } from "./directory-auth.js";

test("vecteur partage avec le connecteur de la boutique (isno-compta)", () => {
  assert.equal(signDirectory("secret-partage", 1_700_000_000_000), "1700000000000.o6VSOSAEvR-Pmjf6bbTPSGut6bRfj4CMB-m1tuOHYh4");
});
