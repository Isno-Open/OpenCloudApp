// Plugin d'exemple : la reference pour ecrire un plugin du portail.
//
// Un plugin est un module ES dont l'export par defaut suit le contrat `Plugin` du coeur
// (server/src/plugin-types.ts) : un identifiant (= nom de son dossier), un titre, une description, des
// reglages DECLARES (le portail dessine l'ecran, le plugin valide), et register(api), appele au demarrage.
// Il est livre dans une image qui contient /plugin/index.js et un shell : le superviseur copie ce dossier
// dans le volume des plugins, puis le portail redemarre et le charge.
import type { Plugin } from "../../server/src/plugin-types.js";
import { SETTING_KIND } from "../../server/src/plugin-contract.js";

// logo d'exemple : une image PNG de 1 pixel
const LOGO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

type ExampleSettings = { greet: boolean; times: number };
const DEFAULTS: ExampleSettings = { greet: true, times: 1 };
const read = (raw: unknown): ExampleSettings => {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const n = Math.round(Number(r.times));
  return { greet: typeof r.greet === "boolean" ? r.greet : DEFAULTS.greet, times: Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : DEFAULTS.times };
};

const plugin: Plugin = {
  id: "example",
  title: "Exemple",
  description: { fr: "Plugin de référence pour écrire les vôtres : des réglages déclarés, et un message au démarrage.", en: "Reference plugin to write your own: declared settings, and a message at startup." },
  settings: {
    fields: [
      { key: "greet", kind: SETTING_KIND.toggle, label: { fr: "Saluer au démarrage", en: "Greet at startup" } },
      { key: "times", kind: SETTING_KIND.number, min: 1, max: 5, under: "greet", label: { fr: "Nombre de fois", en: "Times" } },
    ],
    toForm: (stored) => read(stored),
    fromForm: (input) => read(input),
  },
  register(api) {
    console.log("[plugin example] charge");
    // un theme d'exemple : une couleur d'accent et un logo (image en data: URL, verifiee par le coeur)
    api.registerTheme({
      id: "example",
      label: { fr: "Exemple", en: "Example" },
      dark: { accent: "#ff7a1a", "accent-hover": "#ff9a4d" },
      light: { accent: "#c2560a" },
      logo: { src: LOGO, alt: { fr: "Logo d'exemple", en: "Example logo" } },
    });
  },
};
export default plugin;
