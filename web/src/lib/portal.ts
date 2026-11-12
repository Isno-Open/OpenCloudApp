// Nom du portail (Parametres > General) : barre, titre des onglets, appli d'authentification.
import { loadConfig } from '@core/config.js';
export const DEFAULT_PORTAL_NAME = 'ISNO Cloud';
export const portalName = (): string => loadConfig()?.appName?.trim() || DEFAULT_PORTAL_NAME;
/** Le nom a-t-il ete personnalise ? (sinon la barre garde la marque d'origine) */
export const portalNameIsCustom = (): boolean => !!loadConfig()?.appName?.trim();
