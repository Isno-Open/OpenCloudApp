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
import type { Shell, ShellTheme, ShellApp } from '#lib/shell.ts';
import { installableEnabled, themeIcon, MANIFEST_PATH, THEME_ICON_PATH, DEFAULT_APPLE_ICON } from '#lib/server/pwa.ts';
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

/** Application installable (plugin) : manifeste et icone iOS, ou rien. */
async function shellApp(): Promise<ShellApp> {
  if (!isConfigured() || !(await installableEnabled())) return null;
  return { manifest: MANIFEST_PATH, appleIcon: themeIcon()?.type === 'image/png' ? THEME_ICON_PATH : DEFAULT_APPLE_ICON };
}

export const load: LayoutServerLoad = async ({ request, locals }) => {
  const lang = locals.lang;
  const account = isConfigured() ? await currentAccount(request) : null;
  const shell: Shell = {
    portalName: portalName(), portalNameIsCustom: portalNameIsCustom(),
    nav: navItems(lang),
    adminNav: account?.admin ? adminNavItems(lang, { userAdmin: hasCapability(CAPABILITY.userAdmin) }) : [],
    theme: await shellTheme(lang),
    app: await shellApp(),
  };
  return { lang, shell };
};
