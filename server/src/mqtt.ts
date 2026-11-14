// Relais + ingestion d'etat. Le backend parle au broker avec son cert "relay" (mTLS) ; le broker
// donne a "relay" un acces complet (ACL), la propriete boitier<->compte est verifiee AVANT au niveau
// applicatif. Le navigateur ne parle jamais au broker.
// Le relais ne connait AUCUNE famille de boitiers : il s'abonne a la racine de chacune
// (`<racine>/+/#`), passe chaque message a la famille (device-families.ts), et publie les commandes
// qu'elle traduit, toujours sous `<racine>/<boitier>/`.
import { touchDevice } from "./store.js";
import { applyMessage, onFamilyRegistered, boxState } from "./device-families.js";
import mqtt, { type MqttClient } from "mqtt";
import { readFileSync } from "node:fs";
import { PKI_FILES } from "./pki.js";

const SEEN_WRITE_MS = 60_000;   // au plus une ecriture de « vu il y a » par minute et par boitier
const lastWrite = new Map<string, number>();
function noteActivity(box: string, now: number): void {
  if ((lastWrite.get(box) ?? 0) + SEEN_WRITE_MS > now) return;
  lastWrite.set(box, now);
  touchDevice(box, now).catch((e: unknown) => console.error("[mqtt relay] derniere activite :", e instanceof Error ? e.message : e));
}

/** Le message temoigne-t-il d'une activite du boitier MAINTENANT ? Un message retenu resservi par le
 *  broker (au branchement du relais) ne dit rien du present, sauf une presence « en ligne », qui n'est
 *  retenue que tant que le boitier est connecte. Fonction pure (testable). */
export const isLiveActivity = (retained: boolean, onlineNow: boolean | null): boolean => !retained || onlineNow === true;

/** Le boitier est-il connecte ? Faute d'annonce (jamais vu), non. */
export const deviceOnline = (family: string, box: string): boolean => boxState(family, box)?.online === true;

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
    const now = Date.now();
    const r = applyMessage(t, p.toString("utf8"), packet.retain, now);
    if (!r) return;
    for (const why of r.refused) console.error(`[mqtt relay] ${r.family.id}/${r.box} : ${why}`);
    const online = boxState(r.family.id, r.box)?.online ?? null;
    // une disparition annoncee (testament) n'efface pas la trace : la date reste celle du depart
    if (isLiveActivity(packet.retain, online) && online !== false) noteActivity(r.box, now);
    if (online === false) lastWrite.delete(r.box);
  });
  return client;
}

const roots = new Set<string>();
/** Demarre le relais vers le broker (adresse INTERNE a la pile, fournie par le catalogue du
 *  superviseur) et s'abonne a la racine de chaque famille, celles enregistrees plus tard comprises.
 *  Les messages retenus peuplent l'etat des le branchement. */
export function startRelay(brokerUrl: string): void {
  const c = get(brokerUrl);
  const sub = (root: string): void => { c.subscribe(`${root}/+/#`, { qos: 1 }); };
  c.on("connect", () => { for (const r of roots) sub(r); });
  onFamilyRegistered((f) => {
    if (roots.has(f.topicRoot)) return;
    roots.add(f.topicRoot);
    if (c.connected) sub(f.topicRoot);
  });
}

/** Publie une commande deja verifiee (device-families.ts buildCommand). */
export function publishCommand(topic: string, payload: string, retain: boolean): void {
  if (!client) throw new Error("relais non démarré");
  client.publish(topic, payload, { qos: 1, retain });
}
