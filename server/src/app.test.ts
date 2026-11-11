import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, loginPage, devicesPage } from "./app.js";

test("esc neutralise les caractères HTML", () => {
  assert.equal(esc(`<script>&"'`), "&lt;script&gt;&amp;&quot;&#39;");
});
test("la page login porte le formulaire", () => {
  const h = loginPage();
  assert.match(h, /action="\/login"/);
  assert.match(h, /name="pass"/);
});
test("devicesPage échappe un nom malveillant (anti-XSS)", () => {
  const h = devicesPage("admin", [{ deviceId: "d1", name: "<img src=x onerror=alert(1)>", firmware: "openprofalux" }]);
  assert.ok(!h.includes("<img src=x"));      // jamais le tag brut
  assert.match(h, /&lt;img src=x/);           // bien échappé
});
test("devicesPage sans appareil affiche un état vide", () => {
  assert.match(devicesPage("admin", []), /Aucun appareil/);
});
