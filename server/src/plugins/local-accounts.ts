// Greffon integre « Comptes locaux » (actif par defaut) : le portail gere lui-meme ses utilisateurs.
// Connexion par e-mail + mot de passe (session locale signee), et ecran Utilisateurs pour l'operateur.
import { localProvider } from "../auth-provider.js";
import { CAPABILITY, type Plugin } from "../plugin-types.js";
import { LOCAL_ACCOUNTS_SETTINGS } from "./local-accounts-settings.js";

export const localAccountsPlugin: Plugin = {
  id: "local-accounts",
  title: "Comptes locaux",
  description: { fr: "Le portail gère lui-même ses utilisateurs : connexion par e-mail et mot de passe, écran Utilisateurs.", en: "The portal manages its own users: email and password sign-in, Users screen." },
  settings: LOCAL_ACCOUNTS_SETTINGS,
  register(api) {
    api.registerAuthProvider(localProvider);
    api.provideCapability(CAPABILITY.localLogin);
    api.provideCapability(CAPABILITY.userAdmin);
  },
};
