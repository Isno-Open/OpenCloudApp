// Types de l'app cloud. Les valeurs de domaine (type d'appareil) sont une enumeration declaree ici,
// pas des chaines ecrites a la main (regle « pas de texte litteral dans le code »). Le cloud ne recode
// pas les types : ils viennent de ce que le DEVICE declare (profiles.json cote firmware).

export const DEVICE_TYPE = { volet: 'volet', portail: 'portail' } as const;
export type DeviceType = (typeof DEVICE_TYPE)[keyof typeof DEVICE_TYPE];

/** Un appareil pilote (volet, portail...) rattache a un boitier. Rendu PAR TYPE. */
export type Appareil = {
  id: string;
  boitierId: string;
  /** slug du cover cote firmware, sert a cibler la commande (/api/cmd) */
  slug: string;
  name: string;
  type: DeviceType;
  /** positionnel : affiche la position (slat + %). Impulsionnel (portail) : ni slat ni %. */
  positional: boolean;
  /** 0..100, null si inconnu/non positionnel */
  position: number | null;
  // Les libelles des commandes ne sont PAS stockes ici : le device declare le TYPE et l'action
  // canonique (UP/STOP/DOWN) ; l'app traduit l'etiquette par type+langue (i18n.actionLabels).
  online: boolean;
  /** detail optionnel (derriere la roue crantee) */
  rssiDbm?: number | null;
};

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
};

/** Entitlement (plafond d'appareils), aligne sur entitlement.ts du backend. */
export type Account = {
  email: string;
  name: string | null;
  boitiers: number;
  cap: number;
};
