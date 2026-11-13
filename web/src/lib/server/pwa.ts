// Application installable (plugin « Application installable ») : ce que le manifeste et les gabarits
// en montrent. Actif seulement si le plugin l'est. L'icone est celle du theme s'il en declare une
// (aussi icone de l'onglet, plugin actif ou non), sinon celle d'ISNO.
import { loadConfig } from '@opencloudapp/core/config.js';
import { hasCapability, CAPABILITY } from '@opencloudapp/core/plugins.js';
import { createHash } from 'node:crypto';
import { theme, decodeImage, pngSize, activeTheme } from '@opencloudapp/core/themes.js';
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
/** Icone d'onglet par defaut (source unique des icones ISNO, voir scripts/make-pwa-icons.py). */
export const DEFAULT_FAVICON = { href: '/pwa/icon.svg', type: 'image/svg+xml' } as const;
const PNG_TYPE = 'image/png';
/** Longueur de l'empreinte mise dans l'adresse de l'icone : une icone changee a une autre adresse,
 *  donc aucun cache ne garde l'ancienne. */
const ICON_VERSION_CHARS = 12;

const currentTheme = (): ThemeDecl | null => activeTheme(loadConfig()?.theme);

/** Le plugin est-il actif ? */
export async function installableEnabled(): Promise<boolean> {
  await plugins();
  return hasCapability(CAPABILITY.installableApp);
}

/** Icone du theme decodee (type et octets), ou null. Deja verifiee par le coeur (carree, type accepte). */
export function themeIcon(): { type: string; bytes: Uint8Array<ArrayBuffer> } | null {
  const src = currentTheme()?.icon?.src;
  return src ? decodeImage(src) : null;
}

/** Adresse et type de l'icone d'onglet : celle du theme (adresse versionnee), sinon celle d'ISNO. */
export function favicon(): { href: string; type: string } {
  const src = currentTheme()?.icon?.src;
  if (!src) return DEFAULT_FAVICON;
  const v = createHash('sha256').update(src).digest('hex').slice(0, ICON_VERSION_CHARS);
  return { href: `${THEME_ICON_PATH}?v=${v}`, type: decodeImage(src).type };
}

/** Icone iOS : celle du theme si c'est un PNG (iOS ne prend ni SVG ni WebP), sinon celle d'ISNO. */
export const appleIcon = (): string => (themeIcon()?.type === PNG_TYPE ? favicon().href : DEFAULT_APPLE_ICON);

/** Manifeste de l'application. Couleurs : celles que le theme declare (sinon le navigateur choisit). */
export function manifest(): Record<string, unknown> {
  const name = portalName();
  const t = currentTheme();
  const short = installableAppSettings().shortName || name.slice(0, SHORT_NAME_MAX);
  const icon = themeIcon();
  const size = icon?.type === PNG_TYPE ? pngSize(icon.bytes) : null;
  return {
    name, short_name: short, start_url: '/', scope: '/', display: 'standalone',
    ...(t?.dark?.bg ? { background_color: t.dark.bg } : {}),
    ...(t?.dark?.accent ? { theme_color: t.dark.accent } : {}),
    // l'icone du theme SEULE quand il en a une : a cote de celles d'ISNO, le navigateur prendrait
    // celle dont la taille lui convient le mieux, souvent l'ISNO
    icons: icon ? [{ src: favicon().href, sizes: size ? `${size.width}x${size.height}` : 'any', type: icon.type }] : DEFAULT_ICONS,
  };
}
