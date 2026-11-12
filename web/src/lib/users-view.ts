// Ligne de l'ecran Utilisateurs, preparee par le serveur (UtilisateursView.astro) : des valeurs simples,
// et les DECISIONS deja prises (bloque, invite, modifiable), pour que le composant ne compare rien.
export type UserRow = {
  id: string; name: string; admin: boolean; totpEnabled: boolean;
  locked: boolean;      // bloque apres des echecs, jusqu'a une echeance future
  invited: boolean;     // invite, pas encore de mot de passe
  cap: number; devices: number;
  isSelf: boolean;      // le compte de l'operateur qui regarde
  canChange: boolean;   // role et suppression permis (pas soi-meme, pas le dernier operateur)
};
