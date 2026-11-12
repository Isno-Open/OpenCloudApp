// Donnees de chaque ecran, lues cote serveur (rendu SSR). Une fonction par ecran, partagee par ses
// adresses francaise et anglaise : la page ne fait que la nommer avec sa langue. Les gardes (connexion,
// operateur) et les renvois vivent ici, une fois.
import { redirect, type Cookies } from '@sveltejs/kit';
import { isConfigured, loadConfig, setupWindowRemaining, SETUP_WINDOW_S, DB_KIND } from '@opencloudapp/core/config.js';
import { installedPlugins, BUILTIN_PLUGINS, enabledPlugins, pluginSettingsForm } from '@opencloudapp/core/plugins.js';
import { listAccounts, countDevices, getDeviceAuthByUserCode } from '@opencloudapp/core/store.js';
import { DEVICE_AUTH_STATE } from '@opencloudapp/core/types.js';
import { normalizeUserCode, displayUserCode } from '@opencloudapp/core/device-code.js';
import { localAccountsSettings, totpAllowed, totpRequiredFor } from '@opencloudapp/core/plugins/local-accounts-settings.js';
import { newChallenge, captchaSvg } from '@opencloudapp/core/captcha.js';
import { signingKey } from '@opencloudapp/core/session.js';
import { mailEnabled, smtpConfig, SMTP_SECURITY } from '@opencloudapp/core/mail.js';
import { resolveAccountId, requireAdmin, requireUserAdmin, loginRedirect, localLoginEnabled } from '#lib/server/auth.ts';
import { getAccountInfo, listBoitiers, listAppareils, getBoitier } from '#lib/server/cloud-data.ts';
import { listCatalogPlugins } from '#lib/server/supervisor.ts';
import { accountFromLink } from '#lib/server/password.ts';
import { boot } from '#lib/server/boot.ts';
import { HOST_CHECK, requestScheme, type HostCheck } from '#lib/server/hosts.ts';
import { LANG, ROUTES, t, type Lang } from '#lib/i18n.ts';
import { LINK_VIEW, LINK_COOKIE, type LinkView } from '#lib/link.ts';
import { parseLoginError, LOGIN_INFO } from '#lib/login.ts';
import { PASSWORD_MODE, type PasswordMode } from '#lib/password-view.ts';
import type { InstalledRow, CatalogEntry, SourceRow } from '#lib/plugins-view.ts';
import type { UserRow } from '#lib/users-view.ts';

const LINK_COOKIE_MAX_AGE_S = 600;   // le code scanne attend 10 minutes pendant un detour par la connexion

async function requireAccount(request: Request, lang: Lang): Promise<string> {
  const acc = await resolveAccountId(request);
  if (!acc) redirect(302, ROUTES.connexion[lang]);
  return acc;
}
async function requireOperator(request: Request, lang: Lang): Promise<string> {
  const acc = await requireAdmin(request);
  if (!acc) redirect(302, ROUTES.appareils[lang]);
  return acc;
}

/** Accueil « Mes appareils » : les boitiers du compte et leurs appareils. */
export async function devicesScreen(lang: Lang, request: Request, cookies: Cookies) {
  const acc = await requireAccount(request, lang);
  // un code scanne avant la connexion attend : on reprend la liaison
  const pending = cookies.get(LINK_COOKIE);
  if (pending) redirect(302, `${ROUTES.lier[lang]}?code=${encodeURIComponent(pending)}`);
  const [account, boitiers, appareils] = await Promise.all([getAccountInfo(acc), listBoitiers(acc), listAppareils(acc)]);
  return { account, boitiers, appareils };
}

export async function addScreen(lang: Lang, request: Request) {
  await requireAccount(request, lang);
  return {};
}

export async function accountScreen(lang: Lang, request: Request) {
  const acc = await requireAccount(request, lang);
  const account = await getAccountInfo(acc);
  const sec = localAccountsSettings();
  return { account, totpOn: totpAllowed(sec), totpRequired: totpRequiredFor(sec, account.admin) };
}

/** Connexion : renvoi vers le site externe s'il y en a un (sauf ?local=1, l'entree de l'operateur). */
export async function loginScreen(lang: Lang, request: Request, url: URL) {
  if (await resolveAccountId(request)) redirect(302, ROUTES.appareils[lang]);
  const local = await localLoginEnabled();
  const ext = local && url.searchParams.get('local') === '1' ? null : await loginRedirect();
  // SvelteKit refuse par defaut une redirection vers un autre site : on autorise exactement l'origine
  // de l'adresse de connexion reglee par l'operateur, rien d'autre
  if (ext) redirect(302, ext, { external: [new URL(ext).origin] });
  // captcha : un nouveau defi a chaque affichage, si le reglage est active
  const captcha = local && localAccountsSettings().captcha ? (() => { const c = newChallenge(signingKey()); return { svg: captchaSvg(c.code), token: c.token }; })() : null;
  return {
    error: parseLoginError(url.searchParams.get('e')), step: url.searchParams.get('step'), captcha,
    forgot: local && mailEnabled(),   // mot de passe oublie : seulement si un e-mail peut partir
    info: url.searchParams.get('ok') === LOGIN_INFO.passwordSet,
    none: !local,                     // aucun plugin ne fournit de connexion
  };
}

export async function usersScreen(lang: Lang, request: Request) {
  const self = await requireUserAdmin(request);
  if (!self) redirect(302, ROUTES.appareils[lang]);
  const accounts = await listAccounts();
  const operators = accounts.filter((a) => a.admin).length;
  const now = Date.now();
  const rows: UserRow[] = await Promise.all(accounts.map(async (a) => ({
    id: a.id, name: a.name ?? a.id, admin: a.admin, totpEnabled: !!a.totpEnabled,
    locked: !!a.lockedUntil && a.lockedUntil > now, invited: !a.passHash,
    cap: a.deviceCap, devices: await countDevices(a.id),
    isSelf: a.id === self, canChange: a.id !== self && !(a.admin && operators <= 1),
  })));
  // messagerie configuree : le mot de passe devient facultatif (invitation)
  return { rows, minPass: localAccountsSettings().passwordMinLength, canInvite: mailEnabled() };
}

export async function settingsScreen(lang: Lang, request: Request) {
  await requireOperator(request, lang);
  const s = t(lang);
  const cfg = loadConfig();
  const smtp = smtpConfig();
  const secLabel = { [SMTP_SECURITY.starttls]: 'STARTTLS', [SMTP_SECURITY.tls]: 'TLS', [SMTP_SECURITY.none]: s.smtpSecNone };
  return {
    appName: cfg?.appName ?? '',
    // valeurs initiales de la messagerie ; le mot de passe n'est jamais renvoye au navigateur
    smtp: {
      host: smtp?.host ?? '', port: smtp?.port ?? 587, security: smtp?.security ?? SMTP_SECURITY.starttls, user: smtp?.user ?? '',
      passKept: !!smtp?.pass, fromEmail: smtp?.fromEmail ?? '', fromName: smtp?.fromName ?? '',
    },
    smtpOn: !!smtp,
    securityOptions: Object.values(SMTP_SECURITY).map((v) => ({ value: v, label: secLabel[v] })),
    appHost: (cfg?.publicAppUrl ?? '').replace(/^[a-z]+:\/\//, ''),
    brokerUrl: cfg?.brokerPublicUrl ?? '',
    dbLabel: cfg?.db.kind === DB_KIND.mongoExternal ? s.dbMongoExternal : cfg?.db.kind === DB_KIND.mongoBundled ? s.dbMongoBundled : s.dbSqlite,
  };
}

export async function pluginsScreen(lang: Lang, request: Request) {
  await requireOperator(request, lang);
  const s = t(lang);
  const enabled = enabledPlugins();
  const sourceUrls = loadConfig()?.pluginSources ?? [];
  const catalog = await listCatalogPlugins(sourceUrls);
  const installed: InstalledRow[] = installedPlugins().map((p) => ({ ...p, enabled: enabled.includes(p.id) }));
  // catalogue : les plugins integres puis ceux des sources ; jamais vide, il dit ce qui est en place
  const entries: CatalogEntry[] = [
    ...Object.values(BUILTIN_PLUGINS).map((p) => ({ id: p.id, title: p.title, description: p.description, origin: s.pluginBuiltin, builtin: true, enabled: enabled.includes(p.id) })),
    ...(catalog.ok ? catalog.plugins.map((p) => ({
      id: p.id, title: p.title, description: p.description, origin: p.official ? s.pluginCatalog : p.local ? s.pluginLocal : new URL(p.source).host,
      builtin: false, enabled: enabled.includes(p.id), version: p.version, installedVersion: p.installedVersion, updateAvailable: p.updateAvailable,
    })) : []),
  ];
  const errors = catalog.ok ? catalog.errors : [];
  const sources: SourceRow[] = sourceUrls.map((url) => {
    const err = errors.find((e) => e.source === url);
    return err ? { url, error: err.error } : { url };
  });
  return { installed, entries, sources, catalogError: catalog.ok ? null : catalog.error };
}

export async function pluginSettingsScreen(lang: Lang, request: Request, id: string) {
  await requireOperator(request, lang);
  const plugin = installedPlugins().find((p) => p.id === id);
  const form = plugin ? pluginSettingsForm(id) : null;
  if (!plugin || !form) redirect(302, ROUTES.plugins[lang]);
  return { plugin, fields: form.fields, values: form.values };
}

/** /lier : saisir un code, confirmer l'appareil trouve, ou code invalide/expire. */
export async function linkScreen(lang: Lang, request: Request, url: URL, cookies: Cookies) {
  const raw = url.searchParams.get('code') ?? cookies.get(LINK_COOKIE) ?? '';
  const acc = await resolveAccountId(request);
  if (!acc) {
    // detour par la connexion : on garde le code scanne pour y revenir ensuite
    const n = normalizeUserCode(raw);
    if (n) cookies.set(LINK_COOKIE, n, { path: '/', httpOnly: true, sameSite: 'lax', maxAge: LINK_COOKIE_MAX_AGE_S, secure: requestScheme(request) === 'https' });
    redirect(302, ROUTES.connexion[lang]);
  }
  cookies.delete(LINK_COOKIE, { path: '/' });
  let view: LinkView = LINK_VIEW.enter, code = '', deviceId = '';
  if (raw) {
    const n = normalizeUserCode(raw);
    const rec = n ? await getDeviceAuthByUserCode(n) : null;
    if (n && rec && rec.state === DEVICE_AUTH_STATE.pending && rec.expiresAt > Date.now()) {
      view = LINK_VIEW.confirm; code = displayUserCode(n); deviceId = rec.deviceId;
    } else { view = LINK_VIEW.invalid; code = raw.slice(0, 12); }
  }
  return { view, code, deviceId };
}

/** Donnees communes des deux ecrans du mot de passe (choix depuis un lien, ou oubli). */
type PasswordScreen = { mode: PasswordMode; token: string; valid: boolean; minLength: number };

export async function passwordScreen(url: URL): Promise<PasswordScreen> {
  const token = url.searchParams.get('t') ?? '';
  return { mode: PASSWORD_MODE.set, token, valid: !!token && !!(await accountFromLink(token)), minLength: localAccountsSettings().passwordMinLength };
}

export async function forgotScreen(lang: Lang): Promise<PasswordScreen> {
  await boot();
  if (!mailEnabled()) redirect(302, `${ROUTES.connexion[lang]}?local=1`);
  return { mode: PASSWORD_MODE.forgot, token: '', valid: true, minLength: localAccountsSettings().passwordMinLength };
}

export async function boxScreen(lang: Lang, request: Request, id: string) {
  const acc = await requireAccount(request, lang);
  const b = await getBoitier(id, acc);
  if (!b) redirect(302, ROUTES.appareils[lang]);
  return { boitier: b };
}

/** Installation : tant que l'instance n'est pas configuree. */
export function setupScreen() {
  if (isConfigured()) redirect(302, ROUTES.appareils[LANG.fr]);
  const s = t(LANG.fr);
  const checkLabels = {
    [HOST_CHECK.appFormat]: 'Portail : format', [HOST_CHECK.appDns]: 'Portail : DNS', [HOST_CHECK.appReach]: 'Portail : joignable',
    [HOST_CHECK.brokerFormat]: 'Broker : format', [HOST_CHECK.brokerCert]: 'Broker : certificat', [HOST_CHECK.brokerDns]: 'Broker : DNS', [HOST_CHECK.brokerPort]: 'Broker : joignable',
  } satisfies Record<HostCheck, string>;
  return {
    remaining: setupWindowRemaining(), windowMin: Math.round(SETUP_WINDOW_S / 60), kinds: DB_KIND, checkLabels,
    userAdminLabel: s.setupUserAdmin, userAdminHint: s.setupUserAdminHint, loginUrl: `${ROUTES.connexion[LANG.fr]}?local=1`,
  };
}
