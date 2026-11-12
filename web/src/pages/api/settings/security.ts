// Operateur : securite du greffon « Comptes locaux ». Valeurs bornees par la meme validation qu'a la
// lecture (la longueur minimale ne descend jamais sous le plancher).
import type { APIRoute } from 'astro';
import { loadConfig, saveConfig } from '@core/config.js';
import { installedPlugins } from '@core/plugins.js';
import { normalizeLocalAccountsSettings, PLUGIN_ID } from '@core/plugins/local-accounts-settings.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  if (!installedPlugins().some((p) => p.id === PLUGIN_ID)) return json(404, { error: 'greffon absent' });
  const cfg = loadConfig();
  if (!cfg) return json(409, { error: 'instance non configurée' });
  const b = await readBody(request);
  const settings = normalizeLocalAccountsSettings({
    captcha: b.captcha === true,
    lockout: { enabled: b.lockoutEnabled === true, maxFailures: b.maxFailures, minutes: b.lockMinutes },
    totp: b.totp,
    passwordMinLength: b.passwordMinLength,
  });
  saveConfig({ ...cfg, pluginSettings: { ...(cfg.pluginSettings ?? {}), [PLUGIN_ID]: settings } });
  return json(200, { ok: true, settings });
};
