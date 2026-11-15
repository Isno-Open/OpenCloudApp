// Ligne de l'ecran Utilisateurs, preparee par le serveur (screens.ts) : des valeurs simples,
// et les DECISIONS deja prises (bloque, invite, modifiable), pour que le composant ne compare rien.
export type UserRow = {
  id: string; name: string; admin: boolean; totpEnabled: boolean;
  locked: boolean;      // bloque apres des echecs, jusqu'a une echeance future
  invited: boolean;     // invite dans le portail, pas encore de mot de passe (jamais un compte d'une source)
  cap: number; devices: number;
  isSelf: boolean;      // le compte de l'admin qui regarde
  canChange: boolean;   // role et suppression permis (pas soi-meme, pas le dernier admin)
  source: string | null;   // origine (ex. « www.isno.fr ») ; null : cree dans le portail
  missing: boolean;     // la source ne le liste plus : marque, pas supprime (l'admin decide)
  createdAt: number | null; lastActiveAt: number | null;   // (ms) null : avant que le portail les note
  boxes: AdminBox[];    // ses boitiers, en lecture seule
};

/** Un boitier vu par l'operateur : ce que le portail en sait, sans rien pour le commander. */
export type AdminBox = {
  id: string; name: string; family: { fr: string; en: string } | null;   // null : famille non installee
  firmware: string; latest: string | null; updateAvailable: boolean; trial: boolean;
  online: boolean; cloudDisabled: boolean; lastSeenAt: number | null; pairedAt: number | null;
  devices: number; rssiDbm: number | null; minFreeHeap: number | null; uptimeS: number | null;
  lastReset: { fr: string; en: string } | null;
  alerts: readonly { at: number; text: { fr: string; en: string } }[];   // les plus recentes d'abord
};

/** Resume du parc, en tete de l'ecran. */
export type FleetSummary = { accounts: number; boxes: number; online: number; cloudDisabled: number; updates: number; trial: number };
