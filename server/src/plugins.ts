// Greffons du portail (facon WordPress). Le coeur ne cable AUCUNE gestion de comptes en dur : il charge
// des greffons au meme contrat, `register(api)`. Un greffon peut fournir un mode de connexion
// (registerAuthProvider) et declarer des CAPACITES que l'app consulte pour afficher ses ecrans.
//
// - Integres (livres avec le portail) : actives par la config (`plugins`), « comptes locaux » par defaut.
// - Externes (ex. greffon prive ISNO) : modules charges depuis HARNESS_MODULE (chemins separes par « , »).
import { registerAuthProvider } from "./auth-provider.js";
import { ensureAccount } from "./store.js";
import { DEFAULT_CAP } from "./entitlement.js";
import { localAccountsPlugin } from "./plugins/local-accounts.js";
import { loadConfig } from "./config.js";
import { CAPABILITY, type Capability, type Plugin, type PluginApi, type PluginInfo, type PluginSettings, type SettingValue } from "./plugin-types.js";
export { CAPABILITY, type Capability, type Plugin, type PluginApi, type PluginInfo };

/** Greffons livres avec le portail. */
export const BUILTIN_PLUGINS: Record<string, Plugin> = { [localAccountsPlugin.id]: localAccountsPlugin };
/** Actives quand la config n'en dit rien. */
export const DEFAULT_PLUGINS: readonly string[] = [localAccountsPlugin.id];

const installed: PluginInfo[] = [];
const settingsById = new Map<string, PluginSettings>();
const capabilities = new Set<Capability>();
const api: PluginApi = {
  registerAuthProvider,
  provideCapability: (c) => { capabilities.add(c); },
  ensureAccount,
  defaultCap: DEFAULT_CAP,
};

export const hasCapability = (c: Capability): boolean => capabilities.has(c);
export const installedPlugins = (): readonly PluginInfo[] => installed;

/** Reglages declares par un plugin installe, avec leurs valeurs courantes (null : pas de reglages). */
export function pluginSettingsForm(id: string): { fields: PluginSettings["fields"]; values: Record<string, SettingValue> } | null {
  const s = settingsById.get(id);
  return s ? { fields: s.fields, values: s.toForm(loadConfig()?.pluginSettings?.[id]) } : null;
}
/** Valeur validee par le plugin, prete a enregistrer (null : plugin absent ou sans reglages). */
export function pluginSettingsFromForm(id: string, input: Record<string, unknown>): unknown {
  const s = settingsById.get(id);
  return s ? s.fromForm(input) : null;
}

let loaded: Promise<void> | null = null;
/** Charge les greffons une seule fois : integres actives, puis externes. */
export function loadPlugins(enabled: readonly string[] = DEFAULT_PLUGINS): Promise<void> {
  if (!loaded) loaded = (async () => {
    for (const id of enabled) {
      const p = BUILTIN_PLUGINS[id];
      if (!p) { console.error(`[greffons] greffon integre inconnu : ${id}`); continue; }
      await p.register(api);
      installed.push({ id: p.id, title: p.title, builtin: true, configurable: !!p.settings });
      if (p.settings) settingsById.set(p.id, p.settings);
    }
    for (const mod of (process.env.HARNESS_MODULE ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
      try {
        const m = (await import(/* @vite-ignore */ mod)) as Partial<Plugin> & { register?: Plugin["register"] };
        if (typeof m.register !== "function") throw new Error("pas de register(api)");
        await m.register(api);
        installed.push({ id: m.id ?? mod, title: m.title ?? mod, builtin: false, configurable: !!m.settings });
        if (m.settings) settingsById.set(m.id ?? mod, m.settings);
      } catch (e) {
        console.error(`[greffons] ${mod} non charge :`, e instanceof Error ? e.message : e);
      }
    }
  })();
  return loaded;
}
