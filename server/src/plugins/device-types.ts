// Types d'appareils livres avec le portail, chacun dans son plugin integre, actives d'office : volet
// et portail (ceux que publie le firmware OpenProfalux, profiles.json). On peut les desactiver ; un
// plugin du catalogue peut en ajouter d'autres de la meme facon (api.registerDeviceType).
import { PLUGIN_CATEGORY, type Plugin } from "../plugin-types.js";

export const shutterTypePlugin: Plugin = {
  id: "device-volet",
  title: { fr: "Type d'appareil : volet", en: "Device type: shutter" },
  category: PLUGIN_CATEGORY.devices,
  description: { fr: "Volets roulants : montée, stop, descente, et position quand le volet la donne.", en: "Roller shutters: up, stop, down, and position when the shutter reports it." },
  register(api) {
    api.registerDeviceType({
      id: "volet",
      label: { fr: "Volet", en: "Shutter" },
      icon: { glyph: "🪟" },
      actions: { up: { fr: "Montée", en: "Up" }, stop: { fr: "Stop", en: "Stop" }, down: { fr: "Descente", en: "Down" } },
    });
  },
};

export const gateTypePlugin: Plugin = {
  id: "device-portail",
  title: { fr: "Type d'appareil : portail", en: "Device type: gate" },
  category: PLUGIN_CATEGORY.devices,
  description: { fr: "Portails : ouvrir, stop, fermer.", en: "Gates: open, stop, close." },
  register(api) {
    api.registerDeviceType({
      id: "portail",
      label: { fr: "Portail", en: "Gate" },
      icon: { path: "M4 8h12v12H4M4 11h12M4 14h12M4 17h12M1 20h22M18 14h4M20 12l2 2-2 2" },
      actions: { up: { fr: "Ouvrir", en: "Open" }, stop: { fr: "Stop", en: "Stop" }, down: { fr: "Fermer", en: "Close" } },
    });
  },
};
