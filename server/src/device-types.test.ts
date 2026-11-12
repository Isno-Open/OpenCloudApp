import { test } from "node:test";
import assert from "node:assert/strict";
import { asDeviceType, registerDeviceType, deviceType, clearDeviceTypes } from "./device-types.js";
import { enabledIn, withPluginOn, withPluginOff, ALWAYS_ON_PLUGINS } from "./plugins.js";

const T = { fr: "x", en: "x" };
const ok = { id: "pergola", label: T, icon: { glyph: "☀" }, actions: { up: T, stop: T, down: T } };

test("type d'appareil : declaration verifiee, rien d'injectable", () => {
  assert.deepEqual(asDeviceType(ok), ok);
  assert.deepEqual(asDeviceType({ ...ok, icon: { path: "M4 8h12v12H4" } }).icon, { path: "M4 8h12v12H4" });
  assert.throws(() => asDeviceType({ ...ok, id: "Pergola!" }));
  assert.throws(() => asDeviceType({ ...ok, icon: { path: "M0 0\"/><script>" } }));
  assert.throws(() => asDeviceType({ ...ok, icon: { glyph: "<img src=x>" } }));
  assert.throws(() => asDeviceType({ ...ok, actions: { up: T, stop: T } }));
  assert.throws(() => asDeviceType({ ...ok, label: { fr: "x" } }));
});

test("registre : un type par identifiant, le premier garde la main", () => {
  clearDeviceTypes();
  registerDeviceType(ok);
  assert.throws(() => registerDeviceType({ ...ok, label: { fr: "autre", en: "other" } }));
  assert.equal(deviceType("pergola")?.label.fr, "x");
  assert.equal(deviceType("inconnu"), null);
  clearDeviceTypes();
});

test("actives d'office : presents sans etre listes, eteints seulement par un retrait explicite", () => {
  const [volet] = ALWAYS_ON_PLUGINS;
  assert.ok(volet);
  assert.ok(enabledIn({ plugins: ["local-accounts"] }).includes(volet), "instance deja configuree : active quand meme");
  const off = withPluginOff({ plugins: ["local-accounts"] }, volet);
  assert.ok(!enabledIn(off).includes(volet), "retire : reste eteint");
  assert.deepEqual(off.plugins, ["local-accounts"]);
  const on = withPluginOn(off, volet);
  assert.ok(enabledIn(on).includes(volet), "reactive");
  assert.deepEqual(on.plugins, ["local-accounts"], "jamais ecrit dans la liste");
  assert.deepEqual(withPluginOff({ plugins: ["local-accounts", "x"] }, "x").plugins, ["local-accounts"]);
});
