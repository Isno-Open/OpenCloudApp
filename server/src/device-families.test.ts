import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { CONTROL, FACT, EVENT_LEVEL, FAMILY_CONTRACT, type FamilyDecl, type FamilyMessage, type Fact } from "./family-contract.js";
import { asFamily, registerDeviceFamily, clearDeviceFamilies, applyMessage, buildCommand, boxState, familyById, onFamilyRegistered } from "./device-families.js";
import { isLiveActivity } from "./mqtt.js";

// Petite famille de test : « store » publie `<boitier>/en_ligne` et `<boitier>/store/<id>/{type,pos,etat}` ;
// elle se commande par `store/<id>/cmd` et `store/<id>/aller`.
const STORE: FamilyDecl = {
  id: "famille-test", label: { fr: "Famille de test", en: "Test family" }, icon: { glyph: "T" },
  contract: FAMILY_CONTRACT, topicRoot: "test-famille",
  kinds: [{
    id: "store", label: { fr: "Store", en: "Blind" }, icon: { glyph: "S" },
    controls: [
      { kind: CONTROL.action, id: "monter", label: { fr: "Monter", en: "Up" } },
      { kind: CONTROL.position, id: "pos", label: { fr: "Position", en: "Position" }, settable: true },
      { kind: CONTROL.reading, id: "etat", label: { fr: "État", en: "State" } },
    ],
  }],
  read({ path, payload }): Fact[] {
    if (path === "en_ligne") return [{ fact: FACT.presence, online: payload === "1" }];
    const m = /^store\/([^/]+)\/(type|pos|etat)$/.exec(path);
    if (!m) return [];
    if (m[2] === "type") return [{ fact: FACT.device, device: m[1]!, kind: payload, hidden: payload === "store" ? [] : ["pos"] }];
    if (m[2] === "pos") return [{ fact: FACT.state, device: m[1]!, control: "pos", value: Number(payload) }];
    return [{ fact: FACT.state, device: m[1]!, control: "etat", value: payload }];
  },
  command({ device }, control, value) {
    if (!device) return { path: "maj", payload: "go" };
    return control === "monter" ? { path: `store/${device}/cmd`, payload: "UP" } : { path: `store/${device}/aller`, payload: String(value) };
  },
};

beforeEach(() => clearDeviceFamilies());

test("une famille valable est enregistree ; une seconde a la meme racine est refusee", () => {
  registerDeviceFamily(STORE);
  assert.equal(familyById("famille-test")?.topicRoot, "test-famille");
  assert.throws(() => registerDeviceFamily({ ...STORE, id: "autre" }), /racine de topics/);
  assert.throws(() => registerDeviceFamily(STORE), /deja declaree/);
});

test("declaration verifiee piece par piece : contrat, racine, controles, icone", () => {
  assert.throws(() => asFamily({ ...STORE, contract: 2 }), /contrat 2/);
  assert.throws(() => asFamily({ ...STORE, topicRoot: "a/#" }), /racine/);
  assert.throws(() => asFamily({ ...STORE, kinds: [] }), /au moins un type/);
  const k = STORE.kinds[0]!;
  assert.throws(() => asFamily({ ...STORE, kinds: [{ ...k, controls: [{ kind: "curseur-magique", id: "x", label: k.label }] }] }), /controle inconnu/);
  assert.throws(() => asFamily({ ...STORE, kinds: [{ ...k, controls: [...k.controls, k.controls[0]] }] }), /meme identifiant/);
  assert.throws(() => asFamily({ ...STORE, kinds: [{ ...k, controls: [{ kind: CONTROL.setpoint, id: "c", label: k.label, min: 5, max: 5, step: 1, unit: "°C" }] }] }), /consigne/);
  assert.throws(() => asFamily({ ...STORE, icon: { path: "M0 0\"/><script>" } }), /icone/);
  assert.throws(() => asFamily({ ...STORE, read: undefined }), /read\(\)/);
});

test("les messages deviennent des faits : presence, appareil, etat", () => {
  registerDeviceFamily(STORE);
  applyMessage("test-famille/b1/en_ligne", "1", true, 1);
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  applyMessage("test-famille/b1/store/salon/pos", "40", true, 1);
  applyMessage("test-famille/b1/store/salon/etat", "ferme", true, 1);
  const s = boxState("famille-test", "b1")!;
  assert.equal(s.online, true);
  const d = s.devices.get("salon")!;
  assert.deepEqual([d.kind, d.values.get("pos"), d.values.get("etat")], ["store", 40, "ferme"]);
});

test("un fait mal forme est ecarte seul et signale ; les autres passent", () => {
  registerDeviceFamily(STORE);
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  const r = applyMessage("test-famille/b1/store/salon/pos", "250", true, 1)!;
  assert.equal(r.refused.length, 1, "position hors de 0..100");
  assert.equal(boxState("famille-test", "b1")!.devices.get("salon")!.values.has("pos"), false);
  // un type que la famille ne connait pas : appareil montre « inconnu », sans etat ni commande
  assert.deepEqual(applyMessage("test-famille/b1/store/x/type", "fusee", true, 1)!.refused, []);
  const x = boxState("famille-test", "b1")!.devices.get("x")!;
  assert.deepEqual([x.kind, x.known], ["fusee", false]);
  assert.equal(applyMessage("test-famille/b1/store/x/pos", "10", true, 1)!.refused.length, 1);
  assert.ok("error" in buildCommand(familyById("famille-test")!, { box: "b1", device: "x" }, "monter", null));
  assert.equal(applyMessage("test-famille/b1/store/y/type", "a b", true, 1)!.refused.length, 1, "type au nom invalide");
  assert.deepEqual(applyMessage("test-famille/b1/store/z/type", "", true, 1)!.refused, [], "aucun type declare : appareil inconnu");
  assert.equal(boxState("famille-test", "b1")!.devices.get("z")!.known, false);
  assert.equal(applyMessage("test-famille/b1/store/fantome/pos", "10", true, 1)!.refused.length, 1, "etat d'un appareil jamais vu");
});

test("une famille qui leve une erreur ne casse pas le relais", () => {
  registerDeviceFamily({ ...STORE, read: () => { throw new Error("boum"); } });
  const r = applyMessage("test-famille/b1/en_ligne", "1", false, 1)!;
  assert.match(r.refused[0]!, /boum/);
});

test("un topic hors de toute famille, ou d'un boitier au nom suspect, est ignore", () => {
  registerDeviceFamily(STORE);
  assert.equal(applyMessage("homeassistant/cover/x/config", "{}", true, 1), null);
  assert.equal(applyMessage("test-famille/+/en_ligne", "1", true, 1), null);
});

test("commande : traduite par la famille, toujours sous <racine>/<boitier>/", () => {
  registerDeviceFamily(STORE);
  const f = familyById("famille-test")!;
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  assert.deepEqual(buildCommand(f, { box: "b1", device: "salon" }, "monter", null), { topic: "test-famille/b1/store/salon/cmd", payload: "UP", retain: false });
  assert.deepEqual(buildCommand(f, { box: "b1", device: "salon" }, "pos", 30), { topic: "test-famille/b1/store/salon/aller", payload: "30", retain: false });
});

test("action du boitier entier : declaree par la famille, et seulement quand le boitier la dit possible", () => {
  registerDeviceFamily({ ...STORE, boxControls: [{ id: "maj", label: { fr: "Mettre à jour", en: "Update" }, confirm: { fr: "Il va redémarrer.", en: "It will restart." } }],
    read: ({ path, payload }: FamilyMessage): readonly Fact[] => path === "maj_dispo" ? [{ fact: FACT.box, actions: { maj: payload === "1" }, trial: false, previous: "0.2.15" }] : STORE.read({ box: "b1", path, payload, retained: true }) });
  const f = familyById("famille-test")!;
  assert.ok("error" in buildCommand(f, { box: "b1" }, "maj", null), "jamais dite possible : refusee");
  applyMessage("test-famille/b1/maj_dispo", "1", true, 1);
  assert.deepEqual(buildCommand(f, { box: "b1" }, "maj", null), { topic: "test-famille/b1/maj", payload: "go", retain: false });
  assert.deepEqual([boxState("famille-test", "b1")!.trial, boxState("famille-test", "b1")!.previous], [false, "0.2.15"]);
  applyMessage("test-famille/b1/maj_dispo", "0", true, 1);
  assert.ok("error" in buildCommand(f, { box: "b1" }, "maj", null), "plus possible : refusee");
  assert.ok("error" in buildCommand(f, { box: "b1" }, "effacer", null), "non declaree : refusee");
});

test("actions du boitier : declaration verifiee, action non declaree refusee dans un fait", () => {
  assert.throws(() => asFamily({ ...STORE, boxControls: [{ id: "x", label: { fr: "", en: "" } }] }), /libelle/);
  assert.throws(() => asFamily({ ...STORE, boxControls: [{ id: "x", label: { fr: "X", en: "X" } }, { id: "x", label: { fr: "X", en: "X" } }] }), /meme identifiant/);
  registerDeviceFamily({ ...STORE, read: (): readonly Fact[] => [{ fact: FACT.box, actions: { pirate: true } }] });
  assert.equal(applyMessage("test-famille/b1/x", "", true, 1)!.refused.length, 1);
});

test("commande refusee : appareil ou controle inconnu, lecture seule, valeur hors bornes, controle masque", () => {
  registerDeviceFamily(STORE);
  const f = familyById("famille-test")!;
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  assert.ok("error" in buildCommand(f, { box: "b1", device: "cuisine" }, "monter", null));
  assert.ok("error" in buildCommand(f, { box: "b1", device: "salon" }, "voler", null));
  assert.ok("error" in buildCommand(f, { box: "b1", device: "salon" }, "etat", "x"), "un releve ne se commande pas");
  assert.ok("error" in buildCommand(f, { box: "b1", device: "salon" }, "pos", 101));
  assert.ok("error" in buildCommand(f, { box: "b1", device: "salon" }, "pos", "30"), "une position est un nombre");
  assert.ok("error" in buildCommand(f, { box: "b1/../b2", device: "salon" }, "monter", null), "boitier au nom suspect");
});

test("isolation : une famille ne peut pas publier hors de son boitier", () => {
  for (const path of ["../b2/cmd", "a/+/b", "#", "/abs", "a//b", "x".repeat(200)]) {
    clearDeviceFamilies();
    registerDeviceFamily({ ...STORE, command: () => ({ path, payload: "x" }) });
    applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
    assert.ok("error" in buildCommand(familyById("famille-test")!, { box: "b1", device: "salon" }, "monter", null), `chemin refuse : ${path.slice(0, 20)}`);
  }
  clearDeviceFamilies();
  registerDeviceFamily({ ...STORE, command: () => ({ path: "ok", payload: "x".repeat(600) }) });
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  assert.ok("error" in buildCommand(familyById("famille-test")!, { box: "b1", device: "salon" }, "monter", null), "charge trop longue");
});

test("controle masque sur un appareil : ni commande, ni etat", () => {
  registerDeviceFamily(STORE);
  const f = familyById("famille-test")!;
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  // la famille dit : cet appareil n'a pas de position (hidden)
  const d = boxState("famille-test", "b1")!.devices.get("salon")!;
  boxState("famille-test", "b1")!.devices.set("salon", { ...d, hidden: new Set(["pos"]) });
  assert.ok("error" in buildCommand(f, { box: "b1", device: "salon" }, "pos", 10));
});

test("evenements : niveau et code verifies, les plus recents en tete", () => {
  registerDeviceFamily({ ...STORE, read: ({ payload }: FamilyMessage) => [{ fact: FACT.event, level: payload === "x" ? "panique" as never : EVENT_LEVEL.alert, code: "pile", text: { fr: "Pile faible", en: "Low battery" } }] });
  applyMessage("test-famille/b1/ev", "a", false, 5);
  applyMessage("test-famille/b1/ev", "x", false, 6);
  const ev = boxState("famille-test", "b1")!.events;
  assert.equal(ev.length, 1, "niveau inconnu refuse");
  assert.equal(ev[0]!.code, "pile");
});

test("le relais s'abonne aussi aux familles enregistrees apres lui", () => {
  const seen: string[] = [];
  onFamilyRegistered((f) => seen.push(f.topicRoot));
  registerDeviceFamily(STORE);
  assert.deepEqual(seen, ["test-famille"]);
});

test("activite : un message direct, ou une presence en ligne retenue ; pas un message retenu seul", () => {
  assert.equal(isLiveActivity(false, null), true);
  assert.equal(isLiveActivity(true, true), true);
  assert.equal(isLiveActivity(true, null), false);
  assert.equal(isLiveActivity(true, false), false);
});

test("ACL du broker : une racine par famille, le relais partout, chaque boitier chez lui seulement", async () => {
  const { brokerAcl } = await import("./broker-config.js");
  const acl = brokerAcl(["openprofalux", "test-famille", "openprofalux"]);
  assert.match(acl, /^user relay$/m);
  assert.equal((acl.match(/^topic readwrite openprofalux\/#$/gm) ?? []).length, 1, "une racine en double n'ecrit qu'une ligne");
  assert.match(acl, /^pattern readwrite test-famille\/%u\/#$/m);
  assert.doesNotMatch(acl, /^pattern readwrite #/m);
  assert.throws(() => brokerAcl(["a/#"]), /racine/);
  assert.throws(() => brokerAcl(["x\npattern readwrite #"]), /racine/);
});

// Reglages d'appareil : un store dont on regle la course (secondes), traduite en `store/<id>/reglages`.
const COURSE = { key: "course", kind: "number", label: { fr: "Course (s)", en: "Travel (s)" }, min: 1, max: 180 } as const;
const REGLABLE = {
  ...STORE,
  kinds: [{ ...STORE.kinds[0]!, settings: [COURSE] }],
  read: (m: FamilyMessage): readonly Fact[] => m.path === "store/salon/type"
    ? [{ fact: FACT.device, device: "salon", kind: "store", settings: { course: Number(m.payload) } }]
    : STORE.read(m),
  configure: ({ device }: { box: string; device: string }, values: Readonly<Record<string, unknown>>) => ({ path: `store/${device}/reglages`, payload: JSON.stringify(values) }),
};

test("reglages : declares par le type, valeurs lues dans le fait appareil", async () => {
  const { buildConfigure } = await import("./device-families.js");
  registerDeviceFamily(REGLABLE);
  applyMessage("test-famille/b1/store/salon/type", "19", true, 1);
  assert.equal(boxState("famille-test", "b1")!.devices.get("salon")!.settings.get("course"), 19);
  assert.equal(applyMessage("test-famille/b1/store/salon/type", "500", true, 1)!.refused.length, 1, "valeur publiee hors bornes : refusee");
  assert.equal(boxState("famille-test", "b1")!.devices.get("salon")!.settings.get("course"), 19, "et l'ancienne valeur reste");
  const f = familyById("famille-test")!;
  assert.deepEqual(buildConfigure(f, { box: "b1", device: "salon" }, { course: 21 }), { topic: "test-famille/b1/store/salon/reglages", payload: '{"course":21}', retain: false });
});

test("reglages refuses : cle inconnue, hors bornes, appareil inconnu, type sans reglages, valeurs absentes", async () => {
  const { buildConfigure } = await import("./device-families.js");
  registerDeviceFamily(REGLABLE);
  applyMessage("test-famille/b1/store/salon/type", "19", true, 1);
  const f = familyById("famille-test")!;
  assert.ok("error" in buildConfigure(f, { box: "b1", device: "salon" }, { vitesse: 3 }));
  assert.ok("error" in buildConfigure(f, { box: "b1", device: "salon" }, { course: 0 }));
  assert.ok("error" in buildConfigure(f, { box: "b1", device: "salon" }, { course: "21" }), "un nombre attendu");
  assert.ok("error" in buildConfigure(f, { box: "b1", device: "cuisine" }, { course: 21 }));
  assert.ok("error" in buildConfigure(f, { box: "b1", device: "salon" }, {}));
  clearDeviceFamilies();
  registerDeviceFamily(STORE);
  applyMessage("test-famille/b1/store/salon/type", "store", true, 1);
  assert.ok("error" in buildConfigure(familyById("famille-test")!, { box: "b1", device: "salon" }, { course: 21 }), "type sans reglages");
});

test("reglages : declaration verifiee (nature permise, cles uniques, configure present)", () => {
  const k = REGLABLE.kinds[0]!;
  assert.throws(() => asFamily({ ...REGLABLE, kinds: [{ ...k, settings: [{ key: "mdp", kind: "secret", label: COURSE.label }] }] }), /non permise/);
  assert.throws(() => asFamily({ ...REGLABLE, kinds: [{ ...k, settings: [COURSE, COURSE] }] }), /meme cle/);
  assert.throws(() => asFamily({ ...REGLABLE, kinds: [{ ...k, settings: [{ ...COURSE, min: 5, max: 5 }] }] }), /bornes/);
  assert.throws(() => asFamily({ ...REGLABLE, configure: undefined }), /sans configure/);
});

// Choix d'appareils : une « centrale » choisit ses membres parmi les stores du meme boitier.
const MEMBRES = { key: "membres", kind: "devices", label: { fr: "Membres", en: "Members" }, kinds: ["store"] } as const;
const AVEC_CENTRALE = {
  ...REGLABLE,
  kinds: [REGLABLE.kinds[0]!, { id: "centrale", label: { fr: "Centrale", en: "Central" }, icon: { glyph: "C" }, controls: [STORE.kinds[0]!.controls[0]!], settings: [MEMBRES] }],
  read: (m: FamilyMessage): readonly Fact[] => {
    const c = /^store\/(tout|autre)\/type$/.exec(m.path);
    return c ? [{ fact: FACT.device, device: c[1]!, kind: "centrale", settings: { membres: JSON.parse(m.payload) as string[] } }] : REGLABLE.read(m);
  },
};

test("choix d'appareils : membres lus, et a l'enregistrement seulement des appareils du boitier d'un type permis", async () => {
  const { buildConfigure } = await import("./device-families.js");
  registerDeviceFamily(AVEC_CENTRALE);
  applyMessage("test-famille/b1/store/salon/type", "19", true, 1);
  applyMessage("test-famille/b1/store/cuisine/type", "store", true, 1);
  applyMessage("test-famille/b2/store/chambre/type", "store", true, 1);
  // une centrale annoncee AVANT un de ses membres garde la liste (forme seulement a la lecture)
  applyMessage("test-famille/b1/store/tout/type", '["salon","bureau"]', true, 1);
  assert.deepEqual(boxState("famille-test", "b1")!.devices.get("tout")!.settings.get("membres"), ["salon", "bureau"]);
  assert.equal(applyMessage("test-famille/b1/store/tout/type", '["salon","salon"]', true, 1)!.refused.length, 1, "doublon refuse");
  const f = familyById("famille-test")!, t = { box: "b1", device: "tout" };
  assert.deepEqual(buildConfigure(f, t, { membres: ["salon", "cuisine"] }), { topic: "test-famille/b1/store/tout/reglages", payload: '{"membres":["salon","cuisine"]}', retain: false });
  assert.deepEqual(buildConfigure(f, t, { membres: [] }), { topic: "test-famille/b1/store/tout/reglages", payload: '{"membres":[]}', retain: false }, "vider la liste est permis");
  assert.ok("error" in buildConfigure(f, t, { membres: ["bureau"] }), "appareil absent du boitier");
  assert.ok("error" in buildConfigure(f, t, { membres: ["chambre"] }), "appareil d'un AUTRE boitier");
  assert.ok("error" in buildConfigure(f, t, { membres: ["tout"] }), "lui-meme");
  applyMessage("test-famille/b1/store/autre/type", '["salon"]', true, 1);
  assert.equal(boxState("famille-test", "b1")!.devices.get("autre")!.kind, "centrale");
  assert.ok("error" in buildConfigure(f, t, { membres: ["autre"] }), "type non permis (une centrale)");
  assert.ok("error" in buildConfigure(f, t, { membres: "salon" }), "une liste attendue");
});

test("choix d'appareils : declaration verifiee (types choisissables connus de la famille)", () => {
  const c = AVEC_CENTRALE.kinds[1]!;
  assert.doesNotThrow(() => asFamily(AVEC_CENTRALE), "la declaration valable passe");
  assert.throws(() => asFamily({ ...AVEC_CENTRALE, kinds: [AVEC_CENTRALE.kinds[0]!, { ...c, settings: [{ ...MEMBRES, kinds: ["inconnu"] }] }] }), /inconnu/);
  assert.throws(() => asFamily({ ...AVEC_CENTRALE, kinds: [AVEC_CENTRALE.kinds[0]!, { ...c, settings: [{ ...MEMBRES, kinds: [] }] }] }), /choisissables/);
});

test("reorganiser : rang de 1 au nombre d'appareils du boitier, traduit par la famille ; tri par rang puis ordre des types", async () => {
  const { buildReorder, compareDevices } = await import("./device-families.js");
  const MOBILE = { ...AVEC_CENTRALE, reorder: ({ device }: { box: string; device: string }, rank: number) => ({ path: `store/${device}/rang`, payload: String(rank) }) };
  registerDeviceFamily(MOBILE);
  applyMessage("test-famille/b1/store/salon/type", "19", true, 1);
  applyMessage("test-famille/b1/store/cuisine/type", "store", true, 1);
  applyMessage("test-famille/b1/store/tout/type", '["salon"]', true, 1);
  const f = familyById("famille-test")!, t = { box: "b1", device: "tout" };
  assert.deepEqual(buildReorder(f, t, 1), { topic: "test-famille/b1/store/tout/rang", payload: "1", retain: false });
  assert.deepEqual(buildReorder(f, t, 3), { topic: "test-famille/b1/store/tout/rang", payload: "3", retain: false });
  assert.ok("error" in buildReorder(f, t, 4), "au-dela du nombre d'appareils");
  assert.ok("error" in buildReorder(f, t, 0));
  assert.ok("error" in buildReorder(f, t, 1.5));
  assert.ok("error" in buildReorder(f, t, "1"), "un nombre attendu");
  assert.ok("error" in buildReorder(f, { box: "b1", device: "bureau" }, 1), "appareil inconnu");
  assert.ok("error" in buildReorder(f, { box: "b2", device: "tout" }, 1), "autre boitier");
  // sans rang : dans l'ordre des types declares (store avant centrale ici), puis par nom
  const devs = boxState("famille-test", "b1")!.devices;
  assert.deepEqual([...devs.values()].sort((a, b) => compareDevices(f, a, b)).map((d) => d.name), ["cuisine", "salon", "tout"]);
  const inverse = { ...f, kinds: [...f.kinds].reverse() };
  assert.deepEqual([...devs.values()].sort((a, b) => compareDevices(inverse, a, b)).map((d) => d.name), ["tout", "cuisine", "salon"], "centrale declaree d'abord : en tete");
  clearDeviceFamilies();
  registerDeviceFamily(AVEC_CENTRALE);
  assert.ok("error" in buildReorder(familyById("famille-test")!, t, 1), "famille sans reorder");
  assert.throws(() => asFamily({ ...AVEC_CENTRALE, reorder: 3 }), /reorder/);
});

test("isolation : un reglage traduit hors du boitier est refuse", async () => {
  const { buildConfigure } = await import("./device-families.js");
  registerDeviceFamily({ ...REGLABLE, configure: () => ({ path: "../b2/reglages", payload: "x" }) });
  applyMessage("test-famille/b1/store/salon/type", "19", true, 1);
  assert.ok("error" in buildConfigure(familyById("famille-test")!, { box: "b1", device: "salon" }, { course: 21 }));
});

test("sante et reseau du boitier : verifies, et un fait partiel garde les autres valeurs", () => {
  registerDeviceFamily({ ...STORE, read: ({ path, payload }: FamilyMessage): readonly Fact[] =>
    path === "hb" ? [{ fact: FACT.box, health: { rssiDbm: Number(payload), uptimeS: 60 } }]
    : path === "sys" ? [{ fact: FACT.box, health: { lastReset: { fr: "Logiciel", en: "Software" } }, network: { ssid: "Maison", ip: "192.168.1.9", broker: "ha.local:1883" } }]
    : [] });
  applyMessage("test-famille/b1/hb", "-67", true, 1);
  applyMessage("test-famille/b1/sys", "", true, 1);
  const s = boxState("famille-test", "b1")!;
  assert.deepEqual([s.health.rssiDbm, s.health.uptimeS, s.health.lastReset?.fr], [-67, 60, "Logiciel"]);
  assert.deepEqual(s.network, { ssid: "Maison", ip: "192.168.1.9", broker: "ha.local:1883" });
  assert.equal(applyMessage("test-famille/b1/hb", "12", true, 1)!.refused.length, 1, "un signal positif n'existe pas");
  assert.equal(s.health.rssiDbm, -67, "la valeur d'avant reste");
});

test("rang d'affichage : entier dans ses bornes, garde quand un fait ne le dit pas", () => {
  registerDeviceFamily({ ...STORE, read: ({ path, payload }: FamilyMessage): readonly Fact[] =>
    path === "r" ? [{ fact: FACT.device, device: "salon", kind: "store", ...(payload ? { rank: Number(payload) } : {}) }] : [] });
  applyMessage("test-famille/b1/r", "2", true, 1);
  assert.equal(boxState("famille-test", "b1")!.devices.get("salon")!.rank, 2);
  applyMessage("test-famille/b1/r", "", true, 1);
  assert.equal(boxState("famille-test", "b1")!.devices.get("salon")!.rank, 2, "fait sans rang : le rang reste");
  assert.equal(applyMessage("test-famille/b1/r", "1.5", true, 1)!.refused.length, 1, "un rang est un entier");
});
