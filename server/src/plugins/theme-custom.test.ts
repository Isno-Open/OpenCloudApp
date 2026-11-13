import { test } from "node:test";
import assert from "node:assert/strict";
import { accentPalettes, customThemePlugin, readCustomTheme, CUSTOM_THEME_ID, THEME_TONE } from "./theme-custom.js";
import { asTheme, themeCss, BASE_THEME, BASE_THEME_ID, activeTheme, registerTheme, clearThemes } from "../themes.js";
import { THEME_MODE, THEME_SHAPE } from "../plugin-contract.js";
import { BUILTIN_PLUGINS, pluginAppliedTheme } from "../plugins.js";

const settingsOf = (input: Record<string, unknown>) => readCustomTheme(input);
const themeOf = (input: Record<string, unknown>) => asTheme(customThemePlugin.settings!.preview!(input));

test("theme personnalise : vide, il ne redefinit rien (le theme ISNO reste)", () => {
  const t = themeOf({});
  assert.equal(t.id, CUSTOM_THEME_ID);
  assert.equal(themeCss(t), "", "aucune variable : tout vient de tokens.css");
  assert.equal(t.logo, undefined);
  assert.equal(t.icon, undefined);
  assert.equal(t.mode, THEME_MODE.dark);
});

test("theme personnalise : fond, mode, coins, police, logos, verifies par le coeur", () => {
  const t = themeOf({ mode: "light", tone: "graphite", shape: "square", font: "Nunito", logo: "data:image/png;base64,AA==", logoLight: "data:image/png;base64,BB==" });
  assert.equal(t.mode, THEME_MODE.light);
  assert.equal(t.dark?.bg, "#16181c");
  assert.equal(t.light?.bg, "#f3f4f6");
  assert.equal(t.fonts?.sans, "Nunito");
  assert.equal(t.logo?.srcLight, "data:image/png;base64,BB==");
  assert.ok(themeCss(t).includes("--radius:3px;"), "coins carres : rayons redefinis");
  assert.equal(themeOf({ shape: THEME_SHAPE.round }).shape, THEME_SHAPE.round);
  assert.ok(!themeCss(themeOf({ shape: THEME_SHAPE.round })).includes("--radius"), "coins ISNO : rien a redefinir");
});

test("theme personnalise : chaque fond propose donne un theme valable", () => {
  for (const tone of Object.values(THEME_TONE)) assert.ok(themeOf({ tone, accent: "#c0392b" }), tone);
});

test("theme personnalise : valeurs inconnues ramenees a celles d'ISNO", () => {
  const v = settingsOf({ mode: "fluo", tone: "rose", font: "Comic Sans", shape: "etoile" });
  assert.deepEqual([v.mode, v.tone, v.font, v.shape], [THEME_MODE.dark, THEME_TONE.isno, "", THEME_SHAPE.round]);
});

test("theme personnalise : accent du mode clair regle, ou accent trop clair fonce pour le fond blanc", () => {
  assert.equal(accentPalettes("#2a9d8f", "#115e55").light.accent, "#115e55");
  assert.notEqual(accentPalettes("#ffe066").light.accent, "#ffe066", "jaune clair : fonce en mode clair");
  assert.equal(accentPalettes("#1560bd").light.accent, "#1560bd", "accent deja lisible : repris tel quel");
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
  const v = f.fromForm({ name: "  Ma   maison ", accent: "#FF7A1A", logo: "javascript:alert(1)", icon: "data:text/html;base64,AA==" }) as Record<string, unknown>;
  assert.deepEqual([v.name, v.accent, v.logo, v.icon], ["Ma maison", "#ff7a1a", "", ""]);
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
