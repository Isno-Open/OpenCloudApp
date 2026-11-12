// Plugin integre « Gestion des comptes » : plusieurs comptes sur le portail. Ecran Utilisateurs pour
// l'operateur (creation, invitations, roles) et regles de securite des connexions (captcha, blocage,
// double authentification, mot de passe). Sans lui, le portail n'a que le compte cree a l'installation.
import { CAPABILITY, type Plugin } from "../plugin-types.js";
import { LOCAL_ACCOUNTS_SETTINGS, PLUGIN_ID } from "./local-accounts-settings.js";

export const localAccountsPlugin: Plugin = {
  id: PLUGIN_ID,
  title: "Gestion des comptes",
  description: { fr: "Plusieurs comptes sur le portail : écran Utilisateurs, invitations par e-mail, et règles de sécurité (captcha, blocage, double authentification). Sans lui, seul le compte créé à l'installation existe.", en: "Several accounts on the portal: Users screen, email invitations, and security rules (captcha, lockout, two-factor). Without it, only the account created at installation exists." },
  settings: LOCAL_ACCOUNTS_SETTINGS,
  register(api) {
    api.provideCapability(CAPABILITY.userAdmin);
  },
};
