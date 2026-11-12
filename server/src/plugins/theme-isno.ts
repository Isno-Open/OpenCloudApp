// Theme ISNO, livre avec le portail et actif d'office : le look actuel (valeurs de tokens.css), donc
// rien a redefinir. D'autres themes s'ajoutent par des plugins (api.registerTheme).
import type { Plugin } from "../plugin-types.js";

export const DEFAULT_THEME_ID = "isno";

export const isnoThemePlugin: Plugin = {
  id: "theme-isno",
  title: "Thème ISNO",
  description: { fr: "L'identité ISNO : sombre par défaut, clair au choix. Thème par défaut du portail.", en: "The ISNO identity: dark by default, light on demand. The portal's default theme." },
  register(api) {
    api.registerTheme({ id: DEFAULT_THEME_ID, label: { fr: "ISNO", en: "ISNO" } });
  },
};
