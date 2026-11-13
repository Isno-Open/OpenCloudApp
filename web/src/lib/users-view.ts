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
};
