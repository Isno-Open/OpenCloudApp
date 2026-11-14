// Types de l'app cloud. Les valeurs de domaine (type d'appareil) sont une enumeration declaree ici,
// pas des chaines ecrites a la main (regle « pas de texte litteral dans le code »). Le cloud ne recode
// pas les types : ils viennent de ce que le DEVICE declare (profiles.json cote firmware).

import type { KindDecl, ControlValue } from '@opencloudapp/core/family-contract.js';
import type { SettingValue } from '@opencloudapp/core/plugin-contract.js';
/** Type d'appareil tel que sa FAMILLE le declare (nom, icone, controles de sa carte). */
export type DeviceKind = KindDecl;

/** Un appareil pilote (volet, portail...) rattache a un boitier, tel que la famille du boitier le lit.
 *  Sa carte se dessine depuis les controles de son type. */
export type Appareil = {
  id: string;
  boitierId: string;
  /** identifiant de l'appareil dans le boitier, sert a cibler la commande (/api/cmd) */
  slug: string;
  name: string;
  /** Type connu de la famille, ou null : montre comme « appareil inconnu », sans commandes, jamais
   *  deguise en un autre type. */
  kind: DeviceKind | null;
  /** Type tel que le boitier le declare, pour le dire a l'utilisateur. */
  declaredType: string;
  /** valeurs par controle (position, releves...) */
  values: Record<string, ControlValue>;
  /** controles masques sur CET appareil (ex. la position d'un volet qui ne la donne pas) */
  hidden: readonly string[];
  /** valeurs actuelles de ses reglages (champs declares par son type, kind.settings) */
  settings: Record<string, SettingValue>;
  online: boolean;
  /** detail optionnel (derriere la roue crantee) */
  rssiDbm?: number | null;
};
/** Appareil d'un type connu : le seul qu'une carte de commande accepte. */
export type KnownAppareil = Appareil & { kind: DeviceKind };
export const isKnownAppareil = (a: Appareil): a is KnownAppareil => a.kind !== null;

/** Un boitier appaire au compte. Nommable par l'utilisateur. */
export type Boitier = {
  id: string;            // ex. opf-5ec9d3968f
  /** famille de boitiers installee pour lui (son plugin), ou false : le portail ne sait pas le lire */
  familyKnown: boolean;
  name: string;          // nom donne par l'utilisateur (Maison 1...)
  online: boolean;
  firmware: string;      // ex. 0.2.15+cloud
  updateAvailable: boolean;
  count: number;         // nombre d'appareils
  /** reseau et sante, en lecture seule, tels que le boitier les publie (fait « boitier » de sa famille) */
  wifi?: { ssid: string | null; ip: string | null; rssiDbm: number | null };
  broker?: string | null;
  uptimeS?: number | null;
  memory?: { free: number; min: number } | null;
  lastReset?: { fr: string; en: string } | null;
  uptime?: string;
  radios?: string;       // ex. "868 · 433"
  /** derniere activite vue par le relais (ms), null si jamais vu */
  lastSeenAt: number | null;
};

/** Entitlement (plafond d'appareils), aligne sur entitlement.ts du backend. */
export type Account = {
  email: string;
  name: string | null;
  admin: boolean;
  totpEnabled: boolean;
  boitiers: number;
  cap: number;
};
