// Plugin d'exemple : la reference pour ecrire un plugin du portail. Guide complet : docs/PLUGINS.md.
//
// Un plugin est un module ES dont l'export par defaut suit le contrat `Plugin` du coeur
// (server/src/plugin-types.ts) : un identifiant (= nom de son dossier), un titre, une description, des
// reglages DECLARES (le portail dessine l'ecran, le plugin valide), et register(api), appele au demarrage.
// Il est livre dans une image qui contient /plugin/index.js et un shell : le superviseur copie ce dossier
// dans le volume des plugins, puis le portail redemarre et le charge.
//
// Ce qu'il montre :
// - des reglages de plusieurs natures (case, nombre dependant de la case, couleur), lus et BORNES par
//   une seule fonction pure (`read`), sans assertion de type ;
// - la lecture de ses reglages en marche (`api.settings()`) ;
// - un theme REGLABLE : une fonction, relue a chaque page, dont la couleur vient de ses reglages.
import type { Plugin, ThemeDecl } from "../../server/src/plugin-types.js";
import { SETTING_KIND } from "../../server/src/plugin-contract.js";

// logo d'exemple : une image PNG de 1 pixel
const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const TIMES = { min: 1, max: 5 } as const;
const HEX_RE = /^#[0-9a-f]{6}$/;
type ExampleSettings = { greet: boolean; times: number; accent: string };
const DEFAULTS: ExampleSettings = { greet: true, times: 1, accent: "#ff7a1a" };

/** Propriete propre d'une valeur venue d'ailleurs (config, formulaire), sans rien supposer de sa forme. */
const own = (raw: unknown, key: string): unknown =>
  raw !== null && typeof raw === "object" ? Object.getOwnPropertyDescriptor(raw, key)?.value : undefined;

/** Reglages bornes : ce qui n'est pas valable retombe sur la valeur par defaut. */
const read = (raw: unknown): ExampleSettings => {
  const greet = own(raw, "greet"), times = Math.round(Number(own(raw, "times"))), accent = own(raw, "accent");
  const color = typeof accent === "string" ? accent.trim().toLowerCase() : "";
  return {
    greet: typeof greet === "boolean" ? greet : DEFAULTS.greet,
    times: Number.isFinite(times) ? Math.min(TIMES.max, Math.max(TIMES.min, times)) : DEFAULTS.times,
    accent: HEX_RE.test(color) ? color : DEFAULTS.accent,
  };
};

/** Le theme d'exemple, tel que les reglages le decrivent (le coeur le reverifie a chaque lecture). */
const exampleTheme = (v: ExampleSettings): ThemeDecl => ({
  id: "example",
  label: { fr: "Exemple", en: "Example" },
  dark: { accent: v.accent },
  light: { accent: v.accent },
  logo: { src: LOGO, alt: { fr: "Logo d'exemple", en: "Example logo" } },
});

const plugin: Plugin = {
  id: "example",
  title: "Exemple",
  description: { fr: "Plugin de référence pour écrire les vôtres : des réglages déclarés, un thème réglable, et un message au démarrage.", en: "Reference plugin to write your own: declared settings, an adjustable theme, and a message at startup." },
  settings: {
    fields: [
      { key: "greet", kind: SETTING_KIND.toggle, label: { fr: "Saluer au démarrage", en: "Greet at startup" } },
      { key: "times", kind: SETTING_KIND.number, min: TIMES.min, max: TIMES.max, under: "greet", label: { fr: "Nombre de fois", en: "Times" } },
      { key: "accent", kind: SETTING_KIND.color, label: { fr: "Couleur du thème Exemple", en: "Example theme color" } },
    ],
    toForm: (stored) => read(stored),
    fromForm: (input) => read(input),
  },
  register(api) {
    const { greet, times } = read(api.settings());
    if (greet) for (let i = 0; i < times; i++) console.log("[plugin example] bonjour");
    // une fonction : le theme suit la couleur reglee sans redemarrer le portail
    api.registerTheme(() => exampleTheme(read(api.settings())));
  },
};
export default plugin;
