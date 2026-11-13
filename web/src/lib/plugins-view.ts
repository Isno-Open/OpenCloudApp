// Donnees de l'ecran Plugins, preparees par le serveur (screens.ts) et passees aux composants
// (PluginsPanel, PluginCard). Des valeurs simples : elles traversent vers le navigateur.

type Localized = { fr: string; en: string };

/** Etat d'un plugin, donc de sa carte et de son action. Decide par le serveur. */
export const PLUGIN_STATE = {
  required: 'required',     // toujours actif (le theme de base) : aucune action
  active: 'active',         // actif : reglages (ecrou), desactiver ou desinstaller, mettre a jour
  available: 'available',   // propose : activer (integre) ou installer (catalogue)
} as const;
export type PluginState = (typeof PLUGIN_STATE)[keyof typeof PLUGIN_STATE];

/** Ce qu'une carte demande au panneau (qui appelle l'API ; le portail redemarre). */
export const PLUGIN_ACTION = { enable: 'enable', disable: 'disable', install: 'install' } as const;
export type PluginAction = (typeof PLUGIN_ACTION)[keyof typeof PLUGIN_ACTION];

/** Une carte : un plugin, integre ou venu d'un catalogue. Les champs de version et la DECISION
 *  updateAvailable viennent du superviseur. */
export type PluginCardData = {
  id: string; title: string; description?: Localized; origin: string; builtin: boolean;
  state: PluginState; configurable: boolean;
  version?: string; installedVersion?: string | null; updateAvailable?: boolean;
};

/** Source de catalogue ajoutee par l'operateur, avec son erreur de lecture eventuelle. */
export type SourceRow = { url: string; error?: string };
