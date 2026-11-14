// Plugins du portail (facon WordPress). Le coeur ne cable AUCUNE gestion de comptes en dur : il charge
// des greffons au meme contrat, `register(api)`. Un greffon peut fournir un mode de connexion
// (registerAuthProvider) et declarer des CAPACITES que l'app consulte pour afficher ses ecrans.
//
// - Integres (livres avec le portail) : actives par la config (`plugins`), « comptes locaux » par defaut.
// - Ajoutes depuis le catalogue ISNO : le superviseur copie leur code dans PLUGINS_DIR/<id>/index.js.
// - Developpement : modules charges depuis HARNESS_MODULE (chemins separes par « , »).
//
// Le chargement, la verification du code venu d'ailleurs et les reglages declares sont ceux du moteur
// partage OpenPluginHost (@isno-open/plugin-host) : ce fichier ne garde que ce qui est propre au portail
// (api donnee aux plugins, capacites, theme applique a l'activation, origine des comptes).
import { externalAuthPlugin } from "./plugins/external-auth.js";
import { shutterTypePlugin, gateTypePlugin } from "./plugins/device-types.js";
import { registerDeviceType } from "./device-types.js";
import { registerTheme, BASE_THEME, asTheme } from "./themes.js";
import { installableAppPlugin } from "./plugins/installable-app.js";
import { customThemePlugin } from "./plugins/theme-custom.js";
import type { PortalConfig } from "./config.js";
import { registerAuthProvider, localProvider } from "./auth-provider.js";
import { ensureAccount, markMissingAccounts } from "./store.js";
import { DEFAULT_CAP } from "./entitlement.js";
import { localAccountsPlugin } from "./plugins/local-accounts.js";
import { loadConfig } from "./config.js";
import { createPluginHost, enabledIn as hostEnabledIn, withPluginOn as hostWithPluginOn, withPluginOff as hostWithPluginOff, PLUGIN_ID_RE, type EnabledRules } from "@isno-open/plugin-host";
import { CAPABILITY, PLUGIN_CATEGORY, EXCLUSIVE_CATEGORIES, type Capability, type Plugin, type PluginApi, type PluginExtra, type PluginInfo, type PluginSettings, type SettingValue, type LocalizedText, type PluginCategory, type ThemeDecl } from "./plugin-types.js";
export { CAPABILITY, type Capability, type Plugin, type PluginApi, type PluginInfo, PLUGIN_ID_RE };

/** Greffons livres avec le portail. */
export const BUILTIN_PLUGINS: Record<string, Plugin> = {
  [localAccountsPlugin.id]: localAccountsPlugin, [externalAuthPlugin.id]: externalAuthPlugin,
  [shutterTypePlugin.id]: shutterTypePlugin, [gateTypePlugin.id]: gateTypePlugin,
  [installableAppPlugin.id]: installableAppPlugin, [customThemePlugin.id]: customThemePlugin,
};
/** Actives quand la config n'en dit rien. */
export const DEFAULT_PLUGINS: readonly string[] = [localAccountsPlugin.id];
/** Integres actives D'OFFICE, meme sur une instance deja configuree (sa liste ne les nomme pas) :
 *  seul un retrait explicite (pluginsOff) les eteint. Ce sont les types d'appareils de base. */
export const ALWAYS_ON_PLUGINS: readonly string[] = [shutterTypePlugin.id, gateTypePlugin.id];
const RULES: EnabledRules = { defaults: DEFAULT_PLUGINS, alwaysOn: ALWAYS_ON_PLUGINS };
/** Anciens plugins devenus partie du coeur : une config qui les nomme encore ne cherche pas a les
 *  charger (le theme ISNO, theme de base, est au coeur depuis le 2026-11-13). */
const RETIRED_PLUGINS: readonly string[] = ["theme-isno"];

/** Dossier des plugins ajoutes depuis le catalogue (volume isno-plugins, en lecture seule). */
export const PLUGINS_DIR = process.env.PLUGINS_DIR ?? "/plugins";

// La connexion par e-mail et mot de passe est NATIVE : le compte cree a l'installation peut toujours
// entrer, quels que soient les plugins. Un plugin ajoute le reste (plusieurs comptes, SSO...).
const capabilities = new Set<Capability>([CAPABILITY.localLogin]);

/** Champs propres au portail lus dans la declaration d'un plugin du catalogue, VERIFIES : un theme
 *  par son identifiant, une origine de comptes par une fonction. Le reste est ignore. */
const THEME_ID_RE = /^[a-z0-9][a-z0-9-]{0,40}$/;
function pluginExtra(raw: Readonly<Record<string, unknown>>): PluginExtra {
  const out: PluginExtra = {};
  if (typeof raw.appliesTheme === "string" && THEME_ID_RE.test(raw.appliesTheme)) out.appliesTheme = raw.appliesTheme;
  const source = raw.accountSource;
  if (typeof source === "function") out.accountSource = () => String(source.call(raw));
  return out;
}

const host = createPluginHost<PluginApi, PluginCategory, PluginExtra>({
  builtins: BUILTIN_PLUGINS,
  catalogDir: PLUGINS_DIR,
  devModules: (process.env.HARNESS_MODULE ?? "").split(",").map((x) => x.trim()).filter(Boolean),
  categories: Object.values(PLUGIN_CATEGORY),
  defaultCategory: PLUGIN_CATEGORY.other,
  exclusive: EXCLUSIVE_CATEGORIES,
  extra: pluginExtra,
  makeApi: ({ id }) => ({
    registerAuthProvider,
    provideCapability: (c) => { capabilities.add(c); },
    // le plugin devient la source des comptes qu'il cree ; il ne rapproche que les siens
    ensureAccount: (acc, cap, name) => ensureAccount(acc, cap, name, id),
    reconcileAccounts: (present) => markMissingAccounts(id, present, Date.now()),
    defaultCap: DEFAULT_CAP,
    registerDeviceType,
    registerTheme,
    settings: () => loadConfig()?.pluginSettings?.[id],
  }),
  storedSettings: (id) => loadConfig()?.pluginSettings?.[id],
  log: (m) => console.error(m),
});

/** Nom court de l'origine des comptes crees par un plugin (Utilisateurs), ou son identifiant. */
export function accountSourceLabel(pluginId: string, lang: keyof LocalizedText): string {
  const p = host.plugin(pluginId);
  try { return p?.accountSource?.() || host.installed().find((i) => i.id === pluginId)?.title[lang] || pluginId; } catch { return pluginId; }
}

/** Fiche d'un plugin pour l'ecran Plugins : celle du moteur, plus le theme qu'il applique. */
const withTheme = (info: PluginInfo, p: PluginExtra | null | undefined): PluginInfo =>
  p?.appliesTheme ? { ...info, appliesTheme: p.appliesTheme } : info;

/** Theme a appliquer a l'activation d'un plugin (integre, ou deja copie depuis le catalogue), ou null.
 *  Lu dans la declaration du plugin, sans l'enregistrer : il ne sera charge qu'au redemarrage. */
export async function pluginAppliedTheme(id: string): Promise<string | null> {
  return (await host.peek(id))?.appliesTheme ?? null;
}

/** Categorie d'un plugin (charge, integre ou copie depuis le catalogue), sans l'enregistrer. */
export const pluginCategory = (id: string): Promise<PluginCategory> => host.categoryOf(id);
export const isExclusiveCategory = (c: PluginCategory): boolean => EXCLUSIVE_CATEGORIES.includes(c);

/** Config avec `id` active, et les autres plugins actifs de sa categorie eteints si elle est exclusive
 *  (un seul mode de connexion). Rend aussi ceux qui ont ete eteints, pour le dire. */
export async function withPluginOnExclusive<C extends Pick<PortalConfig, "plugins" | "pluginsOff">>(cfg: C, id: string): Promise<{ cfg: C; turnedOff: string[] }> {
  const r = await host.withPluginOnExclusive(cfg, id, RULES);
  return { cfg: r.state, turnedOff: r.turnedOff };
}

export const hasCapability = (c: Capability): boolean => capabilities.has(c);
export const installedPlugins = (): readonly PluginInfo[] => host.installed().map((i) => withTheme(i, host.plugin(i.id)));

/** Fiche d'un integre, charge ou non (ecran de reglages d'un integre inactif). */
export function builtinInfo(id: string): PluginInfo | null {
  const info = host.builtinInfo(id);
  return info ? withTheme(info, BUILTIN_PLUGINS[id]) : null;
}
/** Reglages d'un plugin : ceux du plugin charge, sinon ceux d'un integre INACTIF (on prepare ses
 *  reglages avant de l'activer). Champs et valeurs courantes, ou null : pas de reglages. */
export function pluginSettingsForm(id: string): { fields: PluginSettings["fields"]; values: Record<string, SettingValue>; previewable: boolean } | null {
  return host.settingsForm(id);
}
/** Apercu d'un theme depuis des valeurs non enregistrees : le theme VERIFIE, ou null (pas d'apercu,
 *  ou valeurs qui ne donnent pas un theme valable). */
export function pluginThemePreview(id: string, input: Record<string, unknown>): ThemeDecl | null {
  const t = host.settingsPreview(id, input);
  if (t === null) return null;
  try { return asTheme(t); } catch { return null; }
}
/** Valeur validee par le plugin, prete a enregistrer (null : plugin absent ou sans reglages). */
export function pluginSettingsFromForm(id: string, input: Record<string, unknown>): unknown {
  return host.settingsFromForm(id, input);
}

let loaded: Promise<void> | null = null;
/** Charge les plugins une seule fois : ceux de la config (integres, ou ajoutes depuis le catalogue et
 *  copies dans PLUGINS_DIR), puis ceux de HARNESS_MODULE (developpement). */
export function loadPlugins(enabled: readonly string[] = DEFAULT_PLUGINS): Promise<void> {
  loaded ??= (async () => {
    registerAuthProvider(localProvider);   // connexion native (voir capabilities)
    registerTheme(BASE_THEME);             // theme de base, au coeur
    await host.load(enabled.filter((id) => !RETIRED_PLUGINS.includes(id)));
  })();
  return loaded;
}

/** Plugins actifs selon une config : sa liste (ou celle par defaut), plus les integres actives d'office
 *  qu'elle n'a pas eteints. */
export const enabledIn = (cfg: Pick<PortalConfig, "plugins" | "pluginsOff"> | null): readonly string[] => hostEnabledIn(cfg, RULES);
/** Plugins actives par la config (ceux qui seront charges au prochain demarrage). */
export const enabledPlugins = (): readonly string[] => enabledIn(loadConfig());
/** Config avec `id` active : ajoute a la liste, retire des eteints. */
export const withPluginOn = <C extends Pick<PortalConfig, "plugins" | "pluginsOff">>(cfg: C, id: string): C => hostWithPluginOn(cfg, id, RULES);
/** Config avec `id` desactive : retire de la liste ; un integre actif d'office est note comme eteint. */
export const withPluginOff = <C extends Pick<PortalConfig, "plugins" | "pluginsOff">>(cfg: C, id: string): C => hostWithPluginOff(cfg, id, RULES);
