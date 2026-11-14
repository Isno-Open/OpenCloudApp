// Famille de boitiers DE TEST, livree avec les tests d'OpenCloudApp (docs/FAMILLES.md) : le cœur
// s'eprouve sur elle, sans dependre d'aucun firmware reel. Un boitier de test publie sous
// `famille-test/<boitier>/` :
//   status                  online | offline (retenu, testament)
//   cover/<id>/attrs        {"type": "volet", "positional": true, "course_s": 19}   (retenu)
//   cover/<id>/position     0..100                                  (retenu)
//   update                  {"installed": "0.2.16", "latest": "0.2.17"} (retenu)
// et se commande par `cover/<id>/set` (OPEN | STOP | CLOSE) et `cover/<id>/set_position` (0..100) ;
// son reglage « course » (secondes) s'envoie sur `cover/<id>/config` ({"course_s": N}).
import type { Plugin } from "../../server/src/plugin-types.js";
import { CONTROL, FACT, FAMILY_CONTRACT, type Fact, type FamilyDecl } from "../../server/src/family-contract.js";
import { PLUGIN_CATEGORY, SETTING_KIND } from "../../server/src/plugin-contract.js";

const ACTION_PAYLOAD: Record<string, string> = { up: "OPEN", stop: "STOP", down: "CLOSE" };

const family: FamilyDecl = {
  id: "famille-test",
  label: { fr: "Famille de test", en: "Test family" },
  icon: { glyph: "T" },
  contract: FAMILY_CONTRACT,
  topicRoot: "famille-test",
  kinds: [{
    id: "volet", label: { fr: "Volet", en: "Shutter" }, icon: { glyph: "V" },
    controls: [
      { kind: CONTROL.action, id: "up", label: { fr: "Montée", en: "Up" }, icon: { glyph: "▲" } },
      { kind: CONTROL.action, id: "stop", label: { fr: "Stop", en: "Stop" }, icon: { glyph: "■" } },
      { kind: CONTROL.action, id: "down", label: { fr: "Descente", en: "Down" }, icon: { glyph: "▼" } },
      { kind: CONTROL.position, id: "position", label: { fr: "Position", en: "Position" }, settable: true },
    ],
    settings: [{ kind: SETTING_KIND.number, key: "course", label: { fr: "Temps de course (s)", en: "Travel time (s)" }, min: 1, max: 180 }],
  }],
  read({ path, payload }): Fact[] {
    if (path === "status") return payload === "online" || payload === "offline" ? [{ fact: FACT.presence, online: payload === "online" }] : [];
    if (path === "update") {
      let u: unknown;
      try { u = JSON.parse(payload); } catch { return []; }
      const o = u && typeof u === "object" ? (u as Record<string, unknown>) : {};
      return [{ fact: FACT.box, ...(typeof o.installed === "string" ? { firmware: o.installed } : {}), ...(typeof o.latest === "string" ? { latest: o.latest } : {}) }];
    }
    const m = /^cover\/([^/]+)\/(attrs|position)$/.exec(path);
    if (!m) return [];
    const device = m[1]!;
    if (m[2] === "position") return [{ fact: FACT.state, device, control: "position", value: Number(payload) }];
    let a: unknown;
    try { a = JSON.parse(payload); } catch { return []; }
    const o = a && typeof a === "object" ? (a as Record<string, unknown>) : {};
    return [{ fact: FACT.device, device, kind: typeof o.type === "string" ? o.type : "", hidden: o.positional === true ? [] : ["position"],
      ...(typeof o.course_s === "number" ? { settings: { course: o.course_s } } : {}) }];
  },
  command({ device }, control, value) {
    if (!device) return null;
    if (control === "position") return { path: `cover/${device}/set_position`, payload: String(value) };
    const p = ACTION_PAYLOAD[control];
    return p ? { path: `cover/${device}/set`, payload: p } : null;
  },
  configure({ device }, values) {
    return { path: `cover/${device}/config`, payload: JSON.stringify({ course_s: values.course }) };
  },
};

const plugin: Plugin = {
  id: "famille-test",
  title: { fr: "Famille de test", en: "Test family" },
  description: { fr: "Boîtiers de test, pour les tests du portail.", en: "Test boxes, for the portal tests." },
  icon: { glyph: "T" },
  category: PLUGIN_CATEGORY.devices,
  register(api) { api.registerDeviceFamily(family); },
};
export default plugin;
