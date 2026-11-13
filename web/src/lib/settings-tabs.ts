// Onglets de l'ecran Parametres. General et Messagerie partagent un formulaire (un bouton Enregistrer) ;
// Instance a ses propres controles (adresse verifiee, broker et base en lecture seule).
export const SETTINGS_PART = { general: 'general', mail: 'mail', instance: 'instance' } as const;
export type SettingsPart = (typeof SETTINGS_PART)[keyof typeof SETTINGS_PART];
export const isSettingsPart = (v: string): v is SettingsPart => Object.values(SETTINGS_PART).some((p) => p === v);
