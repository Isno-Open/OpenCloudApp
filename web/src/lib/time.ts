// Duree relative lisible (« il y a 3 heures », « 3 hours ago »), dans la langue de la page. L'instant
// de reference (now) vient du serveur avec les donnees de la page : le rendu serveur et le navigateur
// ecrivent alors le meme texte.
import type { Lang } from './i18n.ts';

const UNITS: readonly [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600], ['month', 30 * 24 * 3600], ['week', 7 * 24 * 3600],
  ['day', 24 * 3600], ['hour', 3600], ['minute', 60], ['second', 1],
];

export function relativeTime(at: number, now: number, lang: Lang): string {
  const secs = Math.round((at - now) / 1000);
  const fmt = new Intl.RelativeTimeFormat(lang, { numeric: 'auto' });
  for (const [unit, size] of UNITS) if (Math.abs(secs) >= size || unit === 'second') return fmt.format(Math.round(secs / size), unit);
  return fmt.format(0, 'second');
}
