// Greffon integre « Comptes locaux » (actif par defaut) : le portail gere lui-meme ses utilisateurs.
// Connexion par e-mail + mot de passe (session locale signee), et ecran Utilisateurs pour l'operateur.
import { localProvider } from "../auth-provider.js";
import { CAPABILITY, type Plugin } from "../plugin-types.js";

export const localAccountsPlugin: Plugin = {
  id: "local-accounts",
  title: "Comptes locaux",
  register(api) {
    api.registerAuthProvider(localProvider);
    api.provideCapability(CAPABILITY.localLogin);
    api.provideCapability(CAPABILITY.userAdmin);
  },
};
