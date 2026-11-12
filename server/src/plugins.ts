// Plugins du portail (facon WordPress). Le coeur ne cable AUCUNE gestion de comptes en dur : il charge
// des greffons au meme contrat, `register(api)`. Un greffon peut fournir un mode de connexion
// (registerAuthProvider) et declarer des CAPACITES que l'app consulte pour afficher ses ecrans.
//
// - Integres (livres avec le portail) : actives par la config (`plugins`), « comptes locaux » par defaut.
// - Ajoutes depuis le catalogue ISNO : le superviseur copie leur code dans PLUGINS_DIR/<id>/index.js.
// - Developpement : modules charges depuis HARNESS_MODULE (chemins separes par « , »).
import { externalAuthPlugin } from "./plugins/external-auth.js";
import { shutterTypePlugin, gateTypePlugin } from "./plugins/device-types.js";
import { registerDeviceType } from "./device-types.js";
import { registerTheme } from "./themes.js";
import { isnoThemePlugin } from "./plugins/theme-isno.js";
import type { PortalConfig } from "./config.js";
import { registerAuthProvider, localProvider } from "./auth-provider.js";
import { ensureAccount } from "./store.js";
import { DEFAULT_CAP } from "./entitlement.js";
import { localAccountsPlugin } from "./plugins/local-accounts.js";
import { loadConfig } from "./config.js";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { CAPABILITY, type Capability, type Plugin, type PluginApi, type PluginInfo, type PluginSettings, type SettingValue, type LocalizedText } from "./plugin-types.js";
export { CAPABILITY, type Capability, type Plugin, type PluginApi, type PluginInfo };

/** Greffons livres avec le portail. */
export const BUILTIN_PLUGINS: Record<string, Plugin> = {
  [localAccountsPlugin.id]: localAccountsPlugin, [externalAuthPlugin.id]: externalAuthPlugin,
  [shutterTypePlugin.id]: shutterTypePlugin, [gateTypePlugin.id]: gateTypePlugin, [isnoThemePlugin.id]: isnoThemePlugin,
};
/** Actives quand la config n'en dit rien. */
export const DEFAULT_PLUGINS: readonly string[] = [localAccountsPlugin.id];
/** Integres actives D'OFFICE, meme sur une instance deja configuree (sa liste ne les nomme pas) :
 *  seul un retrait explicite (pluginsOff) les eteint. Ce sont les types d'appareils de base. */
export const ALWAYS_ON_PLUGINS: readonly string[] = [shutterTypePlugin.id, gateTypePlugin.id, isnoThemePlugin.id];

const installed: PluginInfo[] = [];
const settingsById = new Map<string, PluginSettings>();
// La connexion par e-mail et mot de passe est NATIVE : le compte cree a l'installation peut toujours
// entrer, quels que soient les plugins. Un plugin ajoute le reste (plusieurs comptes, SSO...).
const capabilities = new Set<Capability>([CAPABILITY.localLogin]);

/** Dossier des plugins ajoutes depuis le catalogue (volume isno-plugins, en lecture seule). */
export const PLUGINS_DIR = process.env.PLUGINS_DIR ?? "/plugins";
/** Identifiant de plugin = nom de dossier : la meme regle que le superviseur. */
export const PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;

/** Enregistre un plugin. */
async function registerOne(p: Plugin, builtin: boolean): Promise<void> {
  const api: PluginApi = {
    registerAuthProvider,
    provideCapability: (c) => { capabilities.add(c); },
    ensureAccount,
    defaultCap: DEFAULT_CAP,
    registerDeviceType,
    registerTheme,
  };
  await p.register(api);
  installed.push({ id: p.id, title: p.title, description: p.description, builtin, configurable: !!p.settings });
  if (p.settings) settingsById.set(p.id, p.settings);
}

/** Un module charge a-t-il la forme d'un plugin ? (export par defaut, ou exports nommes). Code venu
 *  d'ailleurs : chaque morceau est verifie avant d'etre garde, rien n'est pris sur parole. */
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const isText = (v: unknown): v is LocalizedText => isObj(v) && typeof v.fr === "string" && typeof v.en === "string";
const isSettings = (v: unknown): v is PluginSettings =>
  isObj(v) && Array.isArray(v.fields) && typeof v.toForm === "function" && typeof v.fromForm === "function";
function asPlugin(m: Record<string, unknown>, fallbackId: string): Plugin {
  const c = isObj(m.default) ? m.default : m;
  const register = c.register;
  if (typeof register !== "function") throw new Error("pas de register(api)");
  return {
    id: typeof c.id === "string" ? c.id : fallbackId,
    title: typeof c.title === "string" ? c.title : fallbackId,
    description: isText(c.description) ? c.description : undefined,
    settings: isSettings(c.settings) ? c.settings : undefined,
    register: (api: PluginApi) => register.call(c, api),
  };
}

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
/** Charge les plugins une seule fois : ceux de la config (integres, ou ajoutes depuis le catalogue et
 *  copies dans PLUGINS_DIR), puis ceux de HARNESS_MODULE (developpement). */
export function loadPlugins(enabled: readonly string[] = DEFAULT_PLUGINS): Promise<void> {
  if (!loaded) loaded = (async () => {
    registerAuthProvider(localProvider);   // connexion native (voir capabilities)
    for (const id of enabled) {
      try {
        const builtin = BUILTIN_PLUGINS[id];
        if (builtin) { await registerOne(builtin, true); continue; }
        if (!PLUGIN_ID_RE.test(id)) throw new Error("identifiant invalide");
        const p = asPlugin((await import(/* @vite-ignore */ pathToFileURL(join(PLUGINS_DIR, id, "index.js")).href)) as Record<string, unknown>, id);
        if (p.id !== id) throw new Error(`le module se declare « ${p.id} »`);
        await registerOne(p, false);
      } catch (e) {
        console.error(`[plugins] ${id} non charge :`, e instanceof Error ? e.message : e);
      }
    }
    for (const mod of (process.env.HARNESS_MODULE ?? "").split(",").map((x) => x.trim()).filter(Boolean)) {
      try { await registerOne(asPlugin((await import(/* @vite-ignore */ mod)) as Record<string, unknown>, mod), false); }
      catch (e) { console.error(`[plugins] ${mod} non charge :`, e instanceof Error ? e.message : e); }
    }
  })();
  return loaded;
}

/** Plugins actifs selon une config : sa liste (ou celle par defaut), plus les integres actives d'office
 *  qu'elle n'a pas eteints. */
export function enabledIn(cfg: Pick<PortalConfig, "plugins" | "pluginsOff"> | null): readonly string[] {
  const list = cfg?.plugins ?? DEFAULT_PLUGINS;
  const off = cfg?.pluginsOff ?? [];
  return [...list, ...ALWAYS_ON_PLUGINS.filter((id) => !list.includes(id) && !off.includes(id))];
}
/** Plugins actives par la config (ceux qui seront charges au prochain demarrage). */
export const enabledPlugins = (): readonly string[] => enabledIn(loadConfig());

/** Config avec `id` active : ajoute a la liste, retire des eteints. */
export function withPluginOn<C extends Pick<PortalConfig, "plugins" | "pluginsOff">>(cfg: C, id: string): C {
  // la liste ne nomme pas les integres actives d'office : ils le sont sans y etre
  const listed = enabledIn(cfg).filter((x) => !ALWAYS_ON_PLUGINS.includes(x));
  const plugins = ALWAYS_ON_PLUGINS.includes(id) || listed.includes(id) ? listed : [...listed, id];
  return { ...cfg, plugins, pluginsOff: (cfg.pluginsOff ?? []).filter((x) => x !== id) };
}
/** Config avec `id` desactive : retire de la liste ; un integre actif d'office est note comme eteint. */
export function withPluginOff<C extends Pick<PortalConfig, "plugins" | "pluginsOff">>(cfg: C, id: string): C {
  const off = cfg.pluginsOff ?? [];
  return {
    ...cfg,
    plugins: enabledIn(cfg).filter((x) => x !== id && !ALWAYS_ON_PLUGINS.includes(x)),
    pluginsOff: ALWAYS_ON_PLUGINS.includes(id) && !off.includes(id) ? [...off, id] : off,
  };
}
