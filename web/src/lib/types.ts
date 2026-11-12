// Types de l'app cloud. Les valeurs de domaine (type d'appareil) sont une enumeration declaree ici,
// pas des chaines ecrites a la main (regle « pas de texte litteral dans le code »). Le cloud ne recode
// pas les types : ils viennent de ce que le DEVICE declare (profiles.json cote firmware).

import type { DeviceTypeDecl } from '@opencloudapp/core/plugin-types.js';
/** Type d'appareil tel qu'un plugin le DECLARE (nom, icone, libelles des commandes). */
export type DeviceKind = DeviceTypeDecl;

/** Un appareil pilote (volet, portail...) rattache a un boitier. Rendu PAR TYPE. */
export type Appareil = {
  id: string;
  boitierId: string;
  /** slug du cover cote firmware, sert a cibler la commande (/api/cmd) */
  slug: string;
  name: string;
  /** Type declare par un plugin, ou null : aucun plugin ne declare ce type (montre comme « appareil
   *  inconnu », sans commandes, jamais deguise en volet). */
  kind: DeviceKind | null;
  /** Type tel que le boitier le declare (vide s'il n'en declare aucun), pour le dire a l'utilisateur. */
  declaredType: string;
  /** positionnel : affiche la position (slat + %). Impulsionnel (portail) : ni slat ni %. */
  positional: boolean;
  /** 0..100, null si inconnu/non positionnel */
  position: number | null;
  // Les libelles des commandes viennent du type (kind.actions) ; le boitier recoit l'action canonique.
  online: boolean;
  /** detail optionnel (derriere la roue crantee) */
  rssiDbm?: number | null;
};
/** Appareil d'un type connu : le seul qu'une carte de commande accepte. */
export type KnownAppareil = Appareil & { kind: DeviceKind };
export const isKnownAppareil = (a: Appareil): a is KnownAppareil => a.kind !== null;

/** Un boitier OpenProfalux appaire au compte. Nommable par l'utilisateur. */
export type Boitier = {
  id: string;            // ex. opf-5ec9d3968f
  name: string;          // nom donne par l'utilisateur (Maison 1...)
  online: boolean;
  firmware: string;      // ex. 0.2.15+cloud
  updateAvailable: boolean;
  count: number;         // nombre d'appareils
  wifi?: { ssid: string; ip: string; rssiDbm: number | null };
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
