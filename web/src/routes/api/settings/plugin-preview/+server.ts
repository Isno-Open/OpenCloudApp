// Admin : apercu d'un theme reglable depuis des valeurs NON enregistrees (ecran de reglages d'un plugin
// de theme). Le plugin rend son theme, le coeur le verifie comme tout theme, et l'ecran l'applique a
// la page pendant la saisie. Rien n'est ecrit.
import type { RequestHandler } from './$types';
import { pluginThemePreview } from '@opencloudapp/core/plugins.js';
import { themeCss, themeFontsHref } from '@opencloudapp/core/themes.js';
import { requireAdmin, plugins } from '#lib/server/auth.ts';
import { readBody, json } from '#lib/server/http.ts';

export const POST: RequestHandler = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  await plugins();
  const b = await readBody(request);
  const values = b.values && typeof b.values === 'object' ? Object.fromEntries(Object.entries(b.values)) : {};
  const t = pluginThemePreview(String(b.id ?? ''), values);
  if (!t) return json(404, { error: "pas d'aperçu pour ce plugin" });
  return json(200, { css: themeCss(t), fontsHref: themeFontsHref(t) });
};
