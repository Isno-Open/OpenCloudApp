import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { asTheme, themeCss, themeFontsHref, registerTheme, theme, clearThemes } from "./themes.js";
import { THEME_TOKENS } from "./plugin-contract.js";

const T = { fr: "x", en: "x" };
const PNG = "data:image/png;base64,iVBORw0KGgo=";

test("theme : declaration verifiee, rien qui devienne du CSS ou du HTML", () => {
  const ok = asTheme({ id: "maison", label: T, dark: { accent: "#ff8800", bg: "rgb(10, 20, 30)" }, light: { accent: "hsl(30, 100%, 45%)" }, fonts: { sans: "Source Sans 3" }, logo: { src: PNG } });
  assert.equal(ok.dark?.accent, "#ff8800");
  assert.throws(() => asTheme({ id: "m", label: T, dark: { accent: "red;}body{display:none" } }), /couleur invalide/);
  assert.throws(() => asTheme({ id: "m", label: T, dark: { "foot-color": "#fff" } }), /jeton inconnu/);
  assert.throws(() => asTheme({ id: "m", label: T, fonts: { sans: "x';}*{" } }), /police invalide/);
  assert.throws(() => asTheme({ id: "m", label: T, logo: { src: "javascript:alert(1)" } }), /logo invalide/);
  assert.throws(() => asTheme({ id: "m", label: T, logo: { src: "data:text/html;base64,PHNjcmlwdD4=" } }), /logo invalide/);
  assert.throws(() => asTheme({ id: "M!", label: T }), /identifiant invalide/);
});

test("feuille du theme : variables seulement, sombre puis clair, polices avec repli", () => {
  const css = themeCss(asTheme({ id: "m", label: T, dark: { accent: "#f80" }, light: { accent: "#c60" }, fonts: { sans: "Lato" } }));
  assert.equal(css, ":root{--accent:#f80;--font-sans:'Lato',var(--font-sans-stack);}:root[data-theme=\"light\"]{--accent:#c60;}");
  assert.equal(themeCss(asTheme({ id: "vide", label: T })), "");
  assert.equal(themeFontsHref(asTheme({ id: "m", label: T, fonts: { sans: "Source Sans 3" } })), "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700;800&display=swap");
});

test("registre : un theme par identifiant", () => {
  clearThemes();
  registerTheme({ id: "a", label: T });
  assert.throws(() => registerTheme({ id: "a", label: T }));
  assert.equal(theme("a")?.id, "a");
  clearThemes();
});

test("chaque jeton thematisable existe dans les styles du portail (tokens.css)", () => {
  const css = readFileSync(new URL("../web/src/lib/styles/tokens.css", `file://${process.cwd()}/`), "utf8");
  for (const t of THEME_TOKENS) assert.ok(css.includes(`--${t}:`), `--${t} absent de tokens.css`);
  for (const f of ["--font-sans-stack:", "--font-mono-stack:"]) assert.ok(css.includes(f), `${f} absent de tokens.css (repli des polices de theme)`);
});
