// Ce que le gabarit montre sur chaque page : nom du portail et navigation (selon le compte). Prepare
// par le serveur (+layout.server.ts), donne aux gabarits : des valeurs simples.
import type { NavItem } from './i18n.ts';
export type Shell = { portalName: string; portalNameIsCustom: boolean; nav: NavItem[] };
