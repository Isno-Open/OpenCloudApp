// Donnees de l'ecran Plugins, preparees par le serveur (PluginsView.astro) et passees au composant
// interactif (PluginsPanel.svelte). Des valeurs simples : elles traversent vers le navigateur.

type Localized = { fr: string; en: string };

/** Plugin present dans le portail (integre ou ajoute). */
export type InstalledRow = { id: string; title: string; description?: Localized; builtin: boolean; configurable: boolean; enabled: boolean };

/** Entree du catalogue : integree au portail, ou venue d'une source. Les champs de version et la
 *  DECISION updateAvailable viennent du superviseur. */
export type CatalogEntry = {
  id: string; title: string; description?: Localized; origin: string; builtin: boolean; enabled: boolean;
  version?: string; installedVersion?: string | null; updateAvailable?: boolean;
};

/** Source de catalogue ajoutee par l'operateur, avec son erreur de lecture eventuelle. */
export type SourceRow = { url: string; error?: string };
