import { test } from "node:test";
import assert from "node:assert/strict";
import { overCap, DEFAULT_CAP } from "./entitlement.js";

test("overCap : en-dessous du plafond => false (peut enrôler)", () => { assert.equal(overCap(3, 5), false); });
test("overCap : au plafond => true (au-delà = offre payante)", () => { assert.equal(overCap(5, 5), true); });
test("overCap : au-delà => true", () => { assert.equal(overCap(7, 5), true); });
test("plafond par défaut = 5", () => { assert.equal(DEFAULT_CAP, 5); });
