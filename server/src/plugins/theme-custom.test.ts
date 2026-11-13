import { test } from "node:test";
import assert from "node:assert/strict";
import { accentPalettes, customTheme, customThemePlugin, CUSTOM_THEME_ID } from "./theme-custom.js";
import { asTheme, BASE_THEME, BASE_THEME_ID, activeTheme, registerTheme, clearThemes } from "../themes.js";
import { BUILTIN_PLUGINS, pluginAppliedTheme } from "../plugins.js";

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

test("theme personnalise : son activation l'applique", async () => {
  assert.ok(BUILTIN_PLUGINS[customThemePlugin.id]);
  assert.equal(await pluginAppliedTheme(customThemePlugin.id), CUSTOM_THEME_ID);
});

test("theme de base : au coeur, pas un plugin ; le theme en cours y retombe", () => {
  assert.ok(!Object.values(BUILTIN_PLUGINS).some((p) => p.appliesTheme === BASE_THEME_ID), "aucun plugin ne porte le theme de base");
  clearThemes();
  registerTheme(BASE_THEME);
  assert.equal(activeTheme("nexiste-pas")?.id, BASE_THEME_ID);
  assert.equal(activeTheme(undefined)?.id, BASE_THEME_ID);
  clearThemes();
});
