// Application installable (plugin « Application installable ») : ce que le manifeste et les gabarits
// en montrent. Actif seulement si le plugin l'est. L'icone est le logo du theme s'il en a un.
import { loadConfig } from '@opencloudapp/core/config.js';
import { hasCapability, CAPABILITY } from '@opencloudapp/core/plugins.js';
import { theme } from '@opencloudapp/core/themes.js';
import { DEFAULT_THEME_ID } from '@opencloudapp/core/plugins/theme-isno.js';
import { installableAppSettings, SHORT_NAME_MAX } from '@opencloudapp/core/plugins/installable-app.js';
import type { ThemeDecl } from '@opencloudapp/core/plugin-contract.js';
import { plugins } from '#lib/server/auth.ts';
import { portalName } from '#lib/server/portal.ts';

export const MANIFEST_PATH = '/manifest.webmanifest';
export const THEME_ICON_PATH = '/pwa/theme-icon';
const DEFAULT_ICONS = [
  { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png' },
  { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png' },
];
export const DEFAULT_APPLE_ICON = '/pwa/apple-touch-icon.png';

const currentTheme = (): ThemeDecl | null => theme(loadConfig()?.theme ?? DEFAULT_THEME_ID) ?? theme(DEFAULT_THEME_ID);

/** Le plugin est-il actif ? */
export async function installableEnabled(): Promise<boolean> {
  await plugins();
  return hasCapability(CAPABILITY.installableApp);
}

/** Logo du theme decode (type et octets), ou null. Deja verifie par le coeur (data: URL d'image). */
export function themeIcon(): { type: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const src = currentTheme()?.logo?.src;
  const m = src ? /^data:(image\/[a-z+]+);base64,(.+)$/.exec(src) : null;
  return m ? { type: m[1]!, bytes: new Uint8Array(Buffer.from(m[2]!, 'base64')) } : null;
}

/** Manifeste de l'application. Couleurs : celles que le theme declare (sinon le navigateur choisit). */
export function manifest(): Record<string, unknown> {
  const name = portalName();
  const t = currentTheme();
  const short = installableAppSettings().shortName || name.slice(0, SHORT_NAME_MAX);
  const logo = themeIcon();
  return {
    name, short_name: short, start_url: '/', scope: '/', display: 'standalone',
    ...(t?.dark?.bg ? { background_color: t.dark.bg } : {}),
    ...(t?.dark?.accent ? { theme_color: t.dark.accent } : {}),
    icons: logo ? [{ src: THEME_ICON_PATH, sizes: 'any', type: logo.type }, ...DEFAULT_ICONS] : DEFAULT_ICONS,
  };
}
