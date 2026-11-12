// Ce que le gabarit montre sur chaque page : nom du portail et navigation (selon le compte). Prepare
// par le serveur (+layout.server.ts), donne aux gabarits : des valeurs simples.
import type { NavItem } from './i18n.ts';
/** Theme applique : feuille de variables CSS (deja verifiees), polices a charger, logo. */
export type ShellTheme = { css: string; fontsHref: string | null; logo: { src: string; alt: string } | null };
export type Shell = { portalName: string; portalNameIsCustom: boolean; nav: NavItem[]; theme: ShellTheme };
