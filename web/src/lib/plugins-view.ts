// Donnees de l'ecran Plugins, preparees par le serveur (screens.ts) et passees aux composants
// (PluginsPanel, PluginCard). Des valeurs simples : elles traversent vers le navigateur.

import type { PluginCategory } from '@opencloudapp/core/plugin-contract.js';

type Localized = { fr: string; en: string };

/** Etat d'un plugin, donc de sa carte et de son action. Decide par le serveur. */
export const PLUGIN_STATE = {
  core: 'core',             // fait partie du coeur (le theme de base) : ni activer ni desactiver
  active: 'active',         // actif : reglages (ecrou), desactiver ou desinstaller, mettre a jour
  available: 'available',   // propose : activer (integre) ou installer (catalogue)
} as const;
export type PluginState = (typeof PLUGIN_STATE)[keyof typeof PLUGIN_STATE];

/** Ce qu'une carte demande au panneau (qui appelle l'API ; le portail redemarre). */
export const PLUGIN_ACTION = { enable: 'enable', disable: 'disable', install: 'install', useTheme: 'use-theme' } as const;
export type PluginAction = (typeof PLUGIN_ACTION)[keyof typeof PLUGIN_ACTION];

/** Une carte : un plugin, integre ou venu d'un catalogue. Les champs de version et la DECISION
 *  updateAvailable viennent du superviseur. */
export type PluginCardData = {
  id: string; title: string; description?: Localized; origin: string; builtin: boolean;
  state: PluginState; configurable: boolean;
  category: PluginCategory;
  // plugin de theme actif : son theme, et s'il est celui du portail (un seul a la fois)
  theme?: { id: string; label: string; inUse: boolean };
  version?: string; installedVersion?: string | null; updateAvailable?: boolean;
};

/** Source de catalogue ajoutee par l'operateur, avec son erreur de lecture eventuelle. */
export type SourceRow = { url: string; error?: string };
