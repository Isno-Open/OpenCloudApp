// Ce que Google sait deja de chaque boitier (liste de ses appareils, dernier etat pousse), pour ne lui
// envoyer que ce qui change (planGooglePush). Module a part : le Report State sur message MQTT
// (google-report.ts) et celui qui suit une commande (google-smarthome.ts) doivent partager cette memoire,
// sinon l'un croit Google a jour de ce que l'autre vient de changer.
import type { GooglePushMemory } from '@opencloudapp/core/plugins/google-home.js';

const known = new Map<string, { account: string; memory: GooglePushMemory }>();

// Boitiers dont l'etat retenu a ete annule PENDANT un envoi en cours : cet envoi ne doit pas le retenir
// a son retour, il daterait d'avant la commande.
const staleDuringPush = new Set<string>();

/** La memoire d'un boitier POUR CE COMPTE, lue au debut d'un envoi. Un boitier passe a un autre compte
 *  repart de zero : Google ne sait rien de lui sous ce compte-la. */
export function pushMemory(box: string, account: string): GooglePushMemory {
  staleDuringPush.delete(box);
  const k = known.get(box);
  return k && k.account === account ? k.memory : {};
}
/** Retient la memoire d'un boitier pour ce compte (a la fin d'un envoi, voir settleGooglePush). */
export function rememberPush(box: string, account: string, memory: GooglePushMemory): void {
  if (staleDuringPush.delete(box)) delete memory.states;
  known.set(box, { account, memory });
}
/** Le boitier n'appartient plus a personne : on oublie ce qui a ete dit a son ancien compte. */
export function forgetBox(box: string): void { known.delete(box); staleDuringPush.delete(box); }
/** Un etat est parti chez Google par un autre chemin (apres une commande) : le dernier etat retenu ne
 *  vaut plus, le prochain passage le renverra. La liste des appareils, elle, n'a pas change. */
export function forgetReportedStates(box: string): void {
  staleDuringPush.add(box);
  const k = known.get(box);
  if (k) delete k.memory.states;
}
