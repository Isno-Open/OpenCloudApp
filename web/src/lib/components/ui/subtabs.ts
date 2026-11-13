// Sous-onglets d'un ecran (SubTabs.svelte). Un onglet suit l'ancre de l'adresse (#<id>) : il survit
// au rechargement de la page et se partage par un lien.

/** Un onglet : son ancre, son libelle, un compte facultatif, une alerte facultative (son texte). */
export type SubTab = { id: string; label: string; count?: number; alert?: string };

/** Onglet designe par l'ancre de l'adresse, sinon le premier. */
export function tabFromHash(items: readonly SubTab[], hash: string): string {
  const id = hash.replace(/^#/, '');
  return items.some((t) => t.id === id) ? id : (items[0]?.id ?? '');
}

/** Adresse de la page sans ancre : on y revient (premier onglet) apres une action terminee. */
export const pageWithoutTab = (): string => location.pathname + location.search;
