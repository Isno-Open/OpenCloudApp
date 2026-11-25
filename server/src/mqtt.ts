// Relais + ingestion d'etat. Le backend parle au broker avec son cert "relay" (mTLS) ; le broker
// donne a "relay" un acces complet (ACL), la propriete boitier<->compte est verifiee AVANT au niveau
// applicatif. Le navigateur ne parle jamais au broker.
// Le relais ne connait AUCUNE famille de boitiers : il s'abonne a la racine de chacune
// (`<racine>/+/#`), passe chaque message a la famille (device-families.ts), et publie les commandes
// qu'elle traduit, toujours sous `<racine>/<boitier>/`.
import { touchDevice, releaseDevice } from "./store.js";
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

// Ecouteurs « boitier mis a jour » : appeles apres chaque message applique (meme modele que
// onFamilyRegistered). Le portail s'en sert pour pousser l'etat a Google (Report State) ; le coeur
// ne connait ni Google ni les comptes, il signale seulement qu'un boitier a bouge.
const boxUpdateListeners: ((family: string, box: string) => void)[] = [];
export function onBoxUpdated(l: (family: string, box: string) => void): void { boxUpdateListeners.push(l); }

// Etat PEUPLE ? Au demarrage, l'etat des boitiers est vide : il se remplit avec les messages retenus que
// le broker ressert a l'abonnement. Tant que ce flot n'est pas retombe, une liste d'appareils lue dans
// l'etat est INCOMPLETE, et la donner a un tiers qui la prend pour la verite (Google retire les appareils
// absents d'un SYNC) detruirait ce qu'il sait. Peuple = chaque racine abonnee (SUBACK recu) et plus aucun
// message retenu depuis SETTLE_MS. Une reconnexion ne remet pas en cause : l'etat en memoire reste.
const SETTLE_MS = 2000;
const subscribedAt = new Map<string, number | null>();   // par racine : date du premier SUBACK, null avant
let lastRetainedAt = 0;
/** Fonction pure (testable) : les abonnements sont-ils tous acquis, et le flot des retenus retombe ? */
export const isSettled = (acks: Iterable<number | null>, lastRetained: number, now: number, settleMs: number = SETTLE_MS): boolean => {
  let latest = lastRetained;
  for (const a of acks) { if (a === null) return false; if (a > latest) latest = a; }
  return now - latest >= settleMs;
};
/** L'etat des boitiers est-il peuple ? Faux tant que le relais n'est pas demarre. */
export const relaySettled = (now: number = Date.now()): boolean => client !== null && isSettled(subscribedAt.values(), lastRetainedAt, now);
const SETTLE_POLL_MS = 100;
/** Attend que l'etat soit peuple, au plus `timeoutMs`. Rend false si le delai est passe. */
export async function whenRelaySettled(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (!relaySettled()) {
    if (Date.now() >= deadline) return false;
    await new Promise((r) => setTimeout(r, SETTLE_POLL_MS));
  }
  return true;
}

const released = new Set<string>();   // boitiers oublies deja retires
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
    if (packet.retain) lastRetainedAt = now;   // le flot des retenus n'est pas retombe (voir relaySettled)
    const r = applyMessage(t, p.toString("utf8"), packet.retain, now);
    if (!r) return;
    for (const l of boxUpdateListeners) { try { l(r.family.id, r.box); } catch (e) { console.error("[mqtt relay] hook boitier:", e instanceof Error ? e.message : e); } }
    for (const why of r.refused) console.error(`[mqtt relay] ${r.family.id}/${r.box} : ${why}`);
    const st = boxState(r.family.id, r.box);
    // oublie sur le boitier lui-meme : il quitte le compte (retenu compris : le portail etait peut-etre
    // arrete au moment de l'annonce). Seul le boitier peut publier sous son identite (ACL du broker).
    if (!st?.forgotten) released.delete(r.box);
    else if (!released.has(r.box)) {
      released.add(r.box);   // une fois par oubli : les autres retenus du boitier repassent aussi
      releaseDevice(r.box)
        .then(() => console.log(`[mqtt relay] ${r.family.id}/${r.box} : oublie sur le boitier, retire de son compte`))
        .catch((e: unknown) => console.error("[mqtt relay] retrait du boitier oublie :", e instanceof Error ? e.message : e));
    }
    const online = st?.online ?? null;
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
  const sub = (root: string): void => {
    c.subscribe(`${root}/+/#`, { qos: 1 }, (err) => {
      if (!err && subscribedAt.get(root) === null) subscribedAt.set(root, Date.now());
    });
  };
  c.on("connect", () => { for (const r of roots) sub(r); });
  onFamilyRegistered((f) => {
    if (roots.has(f.topicRoot)) return;
    roots.add(f.topicRoot);
    subscribedAt.set(f.topicRoot, null);   // pas peuple tant que cette racine n'est pas abonnee
    if (c.connected) sub(f.topicRoot);
  });
}

/** Publie une commande deja verifiee (device-families.ts buildCommand). */
export function publishCommand(topic: string, payload: string, retain: boolean): void {
  if (!client) throw new Error("relais non démarré");
  client.publish(topic, payload, { qos: 1, retain });
}
