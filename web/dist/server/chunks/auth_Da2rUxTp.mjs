import { a as readSession } from "./session_1DdEKdyP.mjs";
import { f as ensureAccount, i as DEFAULT_CAP, m as getAccount, t as boot } from "./boot_CuD6Xa_G.mjs";
import { n as PLUGIN_ID, t as LOCAL_ACCOUNTS_SETTINGS } from "./local-accounts-settings_vLu63073.mjs";
import { o as loadConfig } from "./config_2VUiG471.mjs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
// ../server/dist/plugin-types.js
/** Ce qu'un greffon peut apporter a l'app. Enumere : l'app s'y refere par son nom. */
var CAPABILITY = {
	localLogin: "localLogin",
	userAdmin: "userAdmin"
};
// ../server/dist/auth-provider.js
var providers = [];
function registerAuthProvider(p) {
	if (!providers.some((x) => x.id === p.id)) providers.push(p);
}
async function resolveAccount(cookie) {
	for (const p of providers) {
		const a = await p.resolveAccount(cookie);
		if (a) return a;
	}
	return null;
}
/** Déconnexion : tous les cookies de session de tous les providers, à effacer ensemble (sinon un
*  provider encore valide reconnecterait aussitôt l'utilisateur, sous un autre compte). */
function logoutCookies() {
	return providers.flatMap((p) => p.logoutCookies?.() ?? []);
}
function externalLoginUrl() {
	for (const p of providers) {
		const u = p.loginUrl?.();
		if (u) return u;
	}
	return null;
}
var localProvider = {
	id: "local",
	resolveAccount: (cookie) => Promise.resolve(readSession(cookie) ?? null),
	logoutCookies: () => ["sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax"]
};
// ../server/dist/plugins/local-accounts.js
var localAccountsPlugin = {
	id: PLUGIN_ID,
	title: "Gestion des comptes",
	description: {
		fr: "Plusieurs comptes sur le portail : écran Utilisateurs, invitations par e-mail, et règles de sécurité (captcha, blocage, double authentification). Sans lui, seul le compte créé à l'installation existe.",
		en: "Several accounts on the portal: Users screen, email invitations, and security rules (captcha, lockout, two-factor). Without it, only the account created at installation exists."
	},
	settings: LOCAL_ACCOUNTS_SETTINGS,
	register(api) {
		api.provideCapability(CAPABILITY.userAdmin);
	}
};
// ../server/dist/plugins.js
/** Greffons livres avec le portail. */
var BUILTIN_PLUGINS = { [localAccountsPlugin.id]: localAccountsPlugin };
/** Actives quand la config n'en dit rien. */
var DEFAULT_PLUGINS = [localAccountsPlugin.id];
var installed = [];
var settingsById = /* @__PURE__ */ new Map();
var capabilities = /* @__PURE__ */ new Set([CAPABILITY.localLogin]);
/** Dossier des plugins ajoutes depuis le catalogue (volume isno-plugins, en lecture seule). */
var PLUGINS_DIR = process.env.PLUGINS_DIR ?? "/plugins";
/** Identifiant de plugin = nom de dossier : la meme regle que le superviseur. */
var PLUGIN_ID_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
/** Enregistre un plugin. */
async function registerOne(p, builtin) {
	const api = {
		registerAuthProvider,
		provideCapability: (c) => {
			capabilities.add(c);
		},
		ensureAccount,
		defaultCap: DEFAULT_CAP
	};
	await p.register(api);
	installed.push({
		id: p.id,
		title: p.title,
		description: p.description,
		builtin,
		configurable: !!p.settings
	});
	if (p.settings) settingsById.set(p.id, p.settings);
}
/** Un module charge a-t-il la forme d'un plugin ? (export par defaut, ou exports nommes). Code venu
*  d'ailleurs : chaque morceau est verifie avant d'etre garde, rien n'est pris sur parole. */
var isObj = (v) => !!v && typeof v === "object";
var isText = (v) => isObj(v) && typeof v.fr === "string" && typeof v.en === "string";
var isSettings = (v) => isObj(v) && Array.isArray(v.fields) && typeof v.toForm === "function" && typeof v.fromForm === "function";
function asPlugin(m, fallbackId) {
	const c = isObj(m.default) ? m.default : m;
	const register = c.register;
	if (typeof register !== "function") throw new Error("pas de register(api)");
	return {
		id: typeof c.id === "string" ? c.id : fallbackId,
		title: typeof c.title === "string" ? c.title : fallbackId,
		description: isText(c.description) ? c.description : void 0,
		settings: isSettings(c.settings) ? c.settings : void 0,
		register: (api) => register.call(c, api)
	};
}
var hasCapability = (c) => capabilities.has(c);
var installedPlugins = () => installed;
/** Reglages declares par un plugin installe, avec leurs valeurs courantes (null : pas de reglages). */
function pluginSettingsForm(id) {
	const s = settingsById.get(id);
	return s ? {
		fields: s.fields,
		values: s.toForm(loadConfig()?.pluginSettings?.[id])
	} : null;
}
/** Valeur validee par le plugin, prete a enregistrer (null : plugin absent ou sans reglages). */
function pluginSettingsFromForm(id, input) {
	const s = settingsById.get(id);
	return s ? s.fromForm(input) : null;
}
var loaded = null;
/** Charge les plugins une seule fois : ceux de la config (integres, ou ajoutes depuis le catalogue et
*  copies dans PLUGINS_DIR), puis ceux de HARNESS_MODULE (developpement). */
function loadPlugins(enabled = DEFAULT_PLUGINS) {
	if (!loaded) loaded = (async () => {
		registerAuthProvider(localProvider);
		for (const id of enabled) try {
			const builtin = BUILTIN_PLUGINS[id];
			if (builtin) {
				await registerOne(builtin, true);
				continue;
			}
			if (!PLUGIN_ID_RE.test(id)) throw new Error("identifiant invalide");
			const p = asPlugin(await import(
				/* @vite-ignore */
				pathToFileURL(join(PLUGINS_DIR, id, "index.js")).href
), id);
			if (p.id !== id) throw new Error(`le module se declare « ${p.id} »`);
			await registerOne(p, false);
		} catch (e) {
			console.error(`[plugins] ${id} non charge :`, e instanceof Error ? e.message : e);
		}
		for (const mod of (process.env.HARNESS_MODULE ?? "").split(",").map((x) => x.trim()).filter(Boolean)) try {
			await registerOne(asPlugin(await import(
				/* @vite-ignore */
				mod
), mod), false);
		} catch (e) {
			console.error(`[plugins] ${mod} non charge :`, e instanceof Error ? e.message : e);
		}
	})();
	return loaded;
}
/** Plugins actives par la config (ceux qui seront charges au prochain demarrage). */
var enabledPlugins = () => loadConfig()?.plugins ?? DEFAULT_PLUGINS;
// src/server/auth.ts
/** Charge les greffons actifs (config, sinon « comptes locaux » par defaut) ; une seule fois. */
var plugins = () => loadPlugins(loadConfig()?.plugins);
async function resolveAccountId(request) {
	await boot();
	await plugins();
	return resolveAccount(request.headers.get("cookie") ?? void 0);
}
/** Compte courant avec son role (id + admin), ou null. Sert au nav et aux ecrans operateur. */
async function currentAccount(request) {
	const id = await resolveAccountId(request);
	if (!id) return null;
	return {
		id,
		admin: !!(await getAccount(id))?.admin
	};
}
/** Garde operateur : rend l'id si le compte courant est admin, sinon null (ecran a rediriger). */
async function requireAdmin(request) {
	const a = await currentAccount(request);
	return a?.admin ? a.id : null;
}
async function loginRedirect() {
	await plugins();
	return externalLoginUrl();
}
/** Garde de l'ecran Utilisateurs : operateur ET un greffon qui fournit la gestion des comptes. */
async function requireUserAdmin(request) {
	const id = await requireAdmin(request);
	return id && hasCapability(CAPABILITY.userAdmin) ? id : null;
}
/** Un greffon fournit-il la connexion locale (e-mail + mot de passe) ? */
async function localLoginEnabled() {
	await plugins();
	return hasCapability(CAPABILITY.localLogin);
}
export { CAPABILITY as _, requireAdmin as a, BUILTIN_PLUGINS as c, enabledPlugins as d, hasCapability as f, logoutCookies as g, pluginSettingsFromForm as h, plugins as i, PLUGINS_DIR as l, pluginSettingsForm as m, localLoginEnabled as n, requireUserAdmin as o, installedPlugins as p, loginRedirect as r, resolveAccountId as s, currentAccount as t, PLUGIN_ID_RE as u };
