import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { asTheme, themeCss, themeFontsHref, registerTheme, theme, clearThemes, listThemes, THEME_SELECTOR } from "./themes.js";
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
  assert.equal(css, ":root:root{--font-sans:'Lato',var(--font-sans-stack);}:root:not([data-theme=\"light\"]){--accent:#f80;}:root:root[data-theme=\"light\"]{--accent:#c60;}");
  assert.equal(themeCss(asTheme({ id: "vide", label: T })), "");
  assert.equal(themeFontsHref(asTheme({ id: "m", label: T, fonts: { sans: "Source Sans 3" } })), "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700;800&display=swap");
});

test("feuille du theme : plus precise que tokens.css, l'ordre des feuilles ne decide pas", () => {
  // specificite des selecteurs en jeu : chaque :root et chaque [attribut] compte un (:not compte son contenu)
  const spec = (sel: string): number => (sel.match(/:root|\[[^\]]+\]/g) ?? []).length;
  const PORTAL = { dark: ":root {", light: ':root[data-theme="light"] {' } as const;
  const css = readFileSync(new URL("../web/src/lib/styles/tokens.css", `file://${process.cwd()}/`), "utf8");
  for (const sel of Object.values(PORTAL)) assert.ok(css.includes(sel), `${sel} absent de tokens.css`);
  assert.ok(spec(THEME_SELECTOR.dark) > spec(PORTAL.dark), "sombre du theme > sombre du portail");
  assert.ok(spec(THEME_SELECTOR.light) > spec(PORTAL.light), "clair du theme > clair du portail");
  assert.ok(spec(THEME_SELECTOR.all) > spec(PORTAL.dark), "polices du theme > polices du portail");
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

/** En-tete PNG (signature + IHDR) de la taille voulue : assez pour la verification d'icone. */
function pngOf(width: number, height: number): string {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8); b.write("IHDR", 12, "latin1"); b.writeUInt32BE(width, 16); b.writeUInt32BE(height, 20);
  return `data:image/png;base64,${b.toString("base64")}`;
}

test("icone : carree, assez grande, d'un type accepte", () => {
  assert.equal(asTheme({ id: "m", label: T, icon: { src: pngOf(512, 512) } }).icon?.src, pngOf(512, 512));
  assert.throws(() => asTheme({ id: "m", label: T, icon: { src: pngOf(600, 200) } }), /carree/);
  assert.throws(() => asTheme({ id: "m", label: T, icon: { src: pngOf(16, 16) } }), /trop petite/);
  assert.throws(() => asTheme({ id: "m", label: T, icon: { src: "data:text/html;base64,PHNjcmlwdD4=" } }), /icone invalide/);
  assert.ok(asTheme({ id: "m", label: T, icon: { src: "data:image/svg+xml;base64,PHN2Zy8+" } }).icon);
});

test("theme rendu par une fonction : relu et reverifie a chaque lecture", () => {
  clearThemes();
  let accent = "#112233";
  registerTheme(() => ({ id: "vivant", label: T, dark: { accent } }));
  assert.equal(theme("vivant")?.dark?.accent, "#112233");
  accent = "#445566";
  assert.equal(theme("vivant")?.dark?.accent, "#445566", "un reglage change s'applique sans redemarrer");
  accent = "red;}body{display:none";
  assert.equal(theme("vivant"), null, "une valeur devenue invalide est refusee a la lecture");
  assert.equal(listThemes().length, 0);
  clearThemes();
});
