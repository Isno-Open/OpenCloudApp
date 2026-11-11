import { test } from "node:test";
import assert from "node:assert/strict";
import { esc, loginPage, devicesPage } from "./app.js";
import type { Cover } from "./mqtt.js";
const cov = (p: Partial<Cover>): Cover => ({ slug: "c", type: "", positional: false, up: "▲", stop: "■", down: "▼", state: null, position: null, ...p });

test("esc neutralise les caractères HTML", () => {
  assert.equal(esc(`<script>&"'`), "&lt;script&gt;&amp;&quot;&#39;");
});
test("la page login porte le formulaire", () => {
  const h = loginPage();
  assert.match(h, /action="\/login"/);
  assert.match(h, /name="pass"/);
});
test("un portail affiche ses libellés (Ouvrir/Fermer), pas ceux d'un volet", () => {
  const h = devicesPage("admin", [{ deviceId: "d1", name: "Entrée", firmware: "openprofalux",
    covers: [cov({ slug: "portail", type: "portail", up: "Ouvrir", stop: "Stop", down: "Fermer" })] }]);
  assert.match(h, /Ouvrir/); assert.match(h, /Fermer/);
  assert.ok(!h.includes("Montée"));
});
test("un volet positionnel affiche sa position", () => {
  const h = devicesPage("admin", [{ deviceId: "d1", name: "Salon", firmware: "openprofalux",
    covers: [cov({ slug: "salon", type: "volet", positional: true, position: 45, up: "Montée", down: "Descente" })] }]);
  assert.match(h, /45 %/); assert.match(h, /Montée/);
});
test("devicesPage échappe un nom malveillant (anti-XSS)", () => {
  const h = devicesPage("admin", [{ deviceId: "d1", name: "<img src=x onerror=alert(1)>", firmware: "fw", covers: [] }]);
  assert.ok(!h.includes("<img src=x"));
  assert.match(h, /&lt;img src=x/);
});
test("sans cover : état d'attente ; sans appareil : état vide", () => {
  assert.match(devicesPage("admin", [{ deviceId: "d", name: "X", firmware: "fw", covers: [] }]), /attente de l'état/);
  assert.match(devicesPage("admin", []), /Aucun appareil/);
});
