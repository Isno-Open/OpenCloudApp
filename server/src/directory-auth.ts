// Requete signee vers l'annuaire des comptes d'un site externe (plugin « Connexion par un site
// externe »). En-tete x-isno-directory: <horodatage ms>.<base64url(HMAC-SHA256(secret, "directory.<horodatage>"))>.
// Meme format et MEME VECTEUR de test que le connecteur de la boutique isno.fr
// (isno-compta, connector/src/directory-auth.ts) : un changement d'un seul cote casse son banc.
import { createHmac } from "node:crypto";

export const DIRECTORY_HEADER = "x-isno-directory";
export const signDirectory = (secret: string, now: number): string =>
  `${now}.${createHmac("sha256", secret).update(`directory.${now}`).digest("base64url")}`;
