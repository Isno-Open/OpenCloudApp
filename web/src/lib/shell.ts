// Ce que le gabarit montre sur chaque page : nom du portail et navigation (selon le compte). Prepare
// par le serveur (+layout.server.ts), donne aux gabarits : des valeurs simples.
import type { NavItem } from './i18n.ts';
/** Theme applique : feuille de variables CSS (deja verifiees), polices a charger, logo, icone d'onglet. */
export type ShellTheme = { css: string; fontsHref: string | null; logo: { src: string; alt: string } | null; icon: { href: string; type: string } };
/** Application installable : null si le plugin est inactif ; sinon de quoi la declarer a la page. */
export type ShellApp = { manifest: string; appleIcon: string } | null;
/** nav : entrees de tous ; adminNav : entrees de l'operateur (vide sinon). */
export type Shell = { portalName: string; portalNameIsCustom: boolean; nav: NavItem[]; adminNav: NavItem[]; theme: ShellTheme; app: ShellApp };
