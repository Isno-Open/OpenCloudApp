// Relais + ingestion d'état. Le backend parle au broker avec son cert "relay" (mTLS) ; le broker
// donne à "relay" un accès complet (ACL), la propriété device<->compte est vérifiée AVANT au niveau
// applicatif. Le navigateur ne parle jamais au broker.
// Ingestion : on s'abonne à l'état des covers publié par les devices (retained) pour afficher, PAR
// TYPE, ce que le device DÉCLARE (type/positional/labels viennent de profiles.json côté firmware ;
// le cloud ne recode rien, il reflète).
import { DEVICE_ACTION } from "./plugin-contract.js";
import { touchDevice } from "./store.js";
import mqtt, { type MqttClient } from "mqtt";
import { readFileSync } from "node:fs";
import { PKI_FILES } from "./pki.js";

// commande de l'app (DEVICE_ACTION) -> charge envoyee au boitier
export const ACTIONS = { [DEVICE_ACTION.up]: "OPEN", [DEVICE_ACTION.stop]: "STOP", [DEVICE_ACTION.down]: "CLOSE" } as const;
export type Action = keyof typeof ACTIONS;
export const cmdTopic = (deviceId: string, slug: string): string => `openprofalux/${deviceId}/cover/${slug}/set`;
export const cmdPayload = (action: Action): string => ACTIONS[action];

/** Un cover tel que le device le déclare. Labels/positional viennent de ses attrs (profiles.json). */
export type Cover = {
  slug: string; type: string; positional: boolean;
  up: string; stop: string; down: string;
  state: string | null; position: number | null;
};
const newCover = (slug: string): Cover => ({ slug, type: "", positional: false, up: "▲", stop: "■", down: "▼", state: null, position: null });

/** Applique un message d'état de cover à la carte. Fonction pure (testable sans broker). */
export function applyCoverMessage(covers: Map<string, Map<string, Cover>>, topic: string, payload: string): void {
  const m = /^openprofalux\/([^/]+)\/cover\/([^/]+)\/(attrs|state|position)$/.exec(topic);
  if (!m) return;
  const dev = m[1]!, slug = m[2]!, leaf = m[3]!;
  let byDev = covers.get(dev);
  if (!byDev) { byDev = new Map(); covers.set(dev, byDev); }
  let c = byDev.get(slug);
  if (!c) { c = newCover(slug); byDev.set(slug, c); }
  if (leaf === "attrs") {
    try {
      const a = JSON.parse(payload) as Record<string, unknown>;
      if (typeof a["type"] === "string") c.type = a["type"];
      if (typeof a["positional"] === "boolean") c.positional = a["positional"];
      if (typeof a["up"] === "string") c.up = a["up"];
      if (typeof a["stop"] === "string") c.stop = a["stop"];
      if (typeof a["down"] === "string") c.down = a["down"];
    } catch { /* payload non-JSON : ignoré */ }
  } else if (leaf === "state") {
    c.state = payload;
  } else {
    const n = Number(payload);
    if (Number.isFinite(n)) c.position = n;
  }
}

const covers = new Map<string, Map<string, Cover>>();
export const coversOf = (deviceId: string): Cover[] => [...(covers.get(deviceId)?.values() ?? [])];

/** Presence d'un boitier, telle qu'il l'annonce : « online » (retenu) a sa connexion, et « offline »
 *  par son testament (LWT), que le broker publie lui-meme s'il disparait. */
export const DEVICE_PRESENCE = { online: "online", offline: "offline" } as const;
const presence = new Map<string, boolean>();
/** Applique un message de presence (openprofalux/<device>/status). Fonction pure (testable). */
export function applyStatusMessage(map: Map<string, boolean>, topic: string, payload: string): void {
  const m = /^openprofalux\/([^/]+)\/status$/.exec(topic);
  if (!m) return;
  const p = payload.trim();
  if (p === DEVICE_PRESENCE.online) map.set(m[1]!, true);
  else if (p === DEVICE_PRESENCE.offline) map.set(m[1]!, false);
}
/** Boitier auteur d'un message (openprofalux/<device>/...), ou null. */
export const deviceOfTopic = (topic: string): string | null => /^openprofalux\/([^/]+)\//.exec(topic)?.[1] ?? null;

/** Le message temoigne-t-il d'une activite du boitier MAINTENANT ? Un message retenu resservi par le
 *  broker (au branchement du relais) ne dit rien du present, sauf l'annonce « online », qui n'est
 *  retenue que tant que le boitier est connecte. Un « offline » recu en direct date sa disparition. */
export function isLiveActivity(topic: string, payload: string, retained: boolean): boolean {
  if (/^openprofalux\/[^/]+\/status$/.test(topic)) return payload.trim() === DEVICE_PRESENCE.online || !retained;
  return !retained;
}
const SEEN_WRITE_MS = 60_000;   // au plus une ecriture par minute et par boitier
const lastWrite = new Map<string, number>();
function noteActivity(deviceId: string, now: number): void {
  if ((lastWrite.get(deviceId) ?? 0) + SEEN_WRITE_MS > now) return;
  lastWrite.set(deviceId, now);
  touchDevice(deviceId, now).catch((e: unknown) => console.error("[mqtt relay] derniere activite :", e instanceof Error ? e.message : e));
}

/** Le boitier est-il connecte ? Faute d'annonce (jamais vu), non. */
export const deviceOnline = (deviceId: string): boolean => presence.get(deviceId) === true;

let client: MqttClient | null = null;
function get(brokerUrl: string): MqttClient {
  if (client) return client;
  client = mqtt.connect(brokerUrl, {
    ca: readFileSync(PKI_FILES.caCrt),
    cert: readFileSync(PKI_FILES.relayCrt),
    key: readFileSync(PKI_FILES.relayKey),
    rejectUnauthorized: true,
  });
  client.on("error", (e: Error) => console.error("[mqtt relay]", e.message));
  client.on("message", (t: string, p: Buffer, packet: { retain: boolean }) => {
    const payload = p.toString("utf8");
    applyCoverMessage(covers, t, payload);
    applyStatusMessage(presence, t, payload);
    const dev = deviceOfTopic(t);
    // une disparition annoncee (testament) n'efface pas la trace : la date reste celle du depart
    if (dev && isLiveActivity(t, payload, packet.retain)) noteActivity(dev, Date.now());
    if (dev && payload.trim() === DEVICE_PRESENCE.offline) lastWrite.delete(dev);
  });
  return client;
}
/** Démarre le relais vers le broker (adresse INTERNE à la pile, fournie par le catalogue du
 *  superviseur) et l'abonnement à l'état des covers et à la présence des boîtiers (retenus => peuplés au
 *  branchement). */
export function startRelay(brokerUrl: string): void {
  const c = get(brokerUrl);
  const sub = (): void => {
    for (const leaf of ["attrs", "state", "position"]) c.subscribe(`openprofalux/+/cover/+/${leaf}`, { qos: 0 });
    c.subscribe("openprofalux/+/status", { qos: 1 });   // presence des boitiers (retenue, LWT)
  };
  c.on("connect", sub);
  if (c.connected) sub();
}
export function publishCmd(deviceId: string, slug: string, action: Action): void {
  if (!client) throw new Error("relais non démarré");
  client.publish(cmdTopic(deviceId, slug), cmdPayload(action), { qos: 1 });
}
