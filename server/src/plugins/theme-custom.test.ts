import { test } from "node:test";
import assert from "node:assert/strict";
import { accentPalettes, customTheme, customThemePlugin, CUSTOM_THEME_ID } from "./theme-custom.js";
import { asTheme } from "../themes.js";
import { enabledIn, withPluginOff, isRequiredPlugin, BUILTIN_PLUGINS, pluginAppliedTheme } from "../plugins.js";
import { DEFAULT_THEME_ID } from "./theme-isno.js";

const EMPTY = { name: "", accent: "", logo: "", icon: "" };

test("theme personnalise : vide, il ne redefinit rien (le theme ISNO reste)", () => {
  const t = asTheme(customTheme(EMPTY));
  assert.equal(t.id, CUSTOM_THEME_ID);
  assert.equal(t.dark, undefined);
  assert.equal(t.logo, undefined);
  assert.equal(t.icon, undefined);
});

test("theme personnalise : une couleur donne des palettes valides, nuances comprises", () => {
  const p = accentPalettes("#ff7a1a");
  assert.equal(p.dark.accent, "#ff7a1a");
  assert.notEqual(p.dark["accent-hover"], p.light["accent-hover"], "survol plus clair sur sombre, plus fonce sur clair");
  assert.ok(asTheme({ id: "x", label: { fr: "x", en: "x" }, ...p }), "le coeur accepte chaque teinte derivee");
  assert.equal(accentPalettes("#ffff66").dark["accent-fg"], "#000000", "accent clair : texte noir");
  assert.equal(accentPalettes("#1560bd").dark["accent-fg"], "#ffffff");
});

test("theme personnalise : reglages bornes par le plugin", () => {
  const f = customThemePlugin.settings!;
  assert.deepEqual(f.fromForm({ name: "  Ma   maison ", accent: "#FF7A1A", logo: "javascript:alert(1)", icon: "data:text/html;base64,AA==" }),
    { name: "Ma maison", accent: "#ff7a1a", logo: "", icon: "" });
  assert.equal((f.fromForm({ accent: "red" }) as { accent: string }).accent, "", "couleur hors format : vide");
});

test("theme personnalise : son activation l'applique ; le theme ISNO ne se desactive pas", async () => {
  assert.ok(BUILTIN_PLUGINS[customThemePlugin.id]);
  assert.equal(await pluginAppliedTheme(customThemePlugin.id), CUSTOM_THEME_ID);
  const isno = Object.values(BUILTIN_PLUGINS).find((p) => p.id !== customThemePlugin.id && p.id.startsWith("theme-"))!;
  assert.ok(isRequiredPlugin(isno.id));
  const cfg = { plugins: ["local-accounts"] };
  assert.deepEqual(withPluginOff(cfg, isno.id), cfg, "desactiver le theme de base ne change rien");
  assert.ok(enabledIn({ plugins: ["local-accounts"], pluginsOff: [isno.id] }).includes(isno.id), "meme nomme dans pluginsOff, il reste actif");
  assert.equal(DEFAULT_THEME_ID, "isno");
});
