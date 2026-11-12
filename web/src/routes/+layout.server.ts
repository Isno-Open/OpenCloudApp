// Ce que le gabarit montre sur toute page : nom du portail, navigation (items operateur si le compte
// courant l'est) et theme choisi. Tant que l'instance n'est pas configuree, rien a lire (pas de base).
import type { LayoutServerLoad } from './$types';
import { isConfigured, loadConfig } from '@opencloudapp/core/config.js';
import { theme, themeCss, themeFontsHref } from '@opencloudapp/core/themes.js';
import { DEFAULT_THEME_ID } from '@opencloudapp/core/plugins/theme-isno.js';
import { hasCapability, CAPABILITY } from '@opencloudapp/core/plugins.js';
import { currentAccount, plugins } from '#lib/server/auth.ts';
import { portalName, portalNameIsCustom } from '#lib/server/portal.ts';
import { navItems, adminNavItems } from '#lib/i18n.ts';
import type { Shell, ShellTheme } from '#lib/shell.ts';
import type { Lang } from '#lib/i18n.ts';

const NO_THEME: ShellTheme = { css: '', fontsHref: null, logo: null };

/** Theme choisi dans Parametres (sinon ISNO), pret a appliquer. Avant l'installation : aucun. */
async function shellTheme(lang: Lang): Promise<ShellTheme> {
  if (!isConfigured()) return NO_THEME;
  await plugins();
  const t = theme(loadConfig()?.theme ?? DEFAULT_THEME_ID) ?? theme(DEFAULT_THEME_ID);
  if (!t) return NO_THEME;
  return { css: themeCss(t), fontsHref: themeFontsHref(t), logo: t.logo ? { src: t.logo.src, alt: t.logo.alt?.[lang] ?? '' } : null };
}

export const load: LayoutServerLoad = async ({ request, locals }) => {
  const lang = locals.lang;
  const account = isConfigured() ? await currentAccount(request) : null;
  const shell: Shell = {
    portalName: portalName(), portalNameIsCustom: portalNameIsCustom(),
    nav: [...navItems(lang), ...(account?.admin ? adminNavItems(lang, { userAdmin: hasCapability(CAPABILITY.userAdmin) }) : [])],
    theme: await shellTheme(lang),
  };
  return { lang, shell };
};
