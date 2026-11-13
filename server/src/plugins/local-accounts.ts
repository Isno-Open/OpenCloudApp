// Plugin integre « Connexion par mot de passe » : un mode de connexion (categorie exclusive, avec la
// connexion par un site externe). Les comptes naissent dans le portail : onglet « Nouvel utilisateur »,
// invitations par e-mail, mot de passe oublie, et regles de securite (captcha, blocage, double
// authentification, longueur du mot de passe). L'ecran Utilisateurs (liste, role, plafond) est au coeur.
// Identifiant historique « local-accounts » garde : il est dans la config des instances.
import { CAPABILITY, PLUGIN_CATEGORY, type Plugin } from "../plugin-types.js";
import { LOCAL_ACCOUNTS_SETTINGS, PLUGIN_ID } from "./local-accounts-settings.js";

export const localAccountsPlugin: Plugin = {
  id: PLUGIN_ID,
  title: { fr: "Connexion par mot de passe", en: "Password sign-in" },
  description: { fr: "Les comptes se créent dans le portail : création, invitation par e-mail, mot de passe oublié, et règles de sécurité (captcha, blocage, double authentification).", en: "Accounts are created in the portal: creation, email invitation, forgotten password, and security rules (captcha, lockout, two-factor)." },
  category: PLUGIN_CATEGORY.login,
  settings: LOCAL_ACCOUNTS_SETTINGS,
  register(api) {
    api.provideCapability(CAPABILITY.accountCreation);
  },
};
