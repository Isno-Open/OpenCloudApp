// Ce que le gabarit montre sur toute page : nom du portail et navigation (items operateur si le compte
// courant l'est). Tant que l'instance n'est pas configuree, rien a lire (pas de base).
import type { LayoutServerLoad } from './$types';
import { isConfigured } from '@opencloudapp/core/config.js';
import { hasCapability, CAPABILITY } from '@opencloudapp/core/plugins.js';
import { currentAccount } from '#lib/server/auth.ts';
import { portalName, portalNameIsCustom } from '#lib/server/portal.ts';
import { navItems, adminNavItems } from '#lib/i18n.ts';
import type { Shell } from '#lib/shell.ts';

export const load: LayoutServerLoad = async ({ request, locals }) => {
  const lang = locals.lang;
  const account = isConfigured() ? await currentAccount(request) : null;
  const shell: Shell = {
    portalName: portalName(), portalNameIsCustom: portalNameIsCustom(),
    nav: [...navItems(lang), ...(account?.admin ? adminNavItems(lang, { userAdmin: hasCapability(CAPABILITY.userAdmin) }) : [])],
  };
  return { lang, shell };
};
