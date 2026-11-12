// Reglages du greffon « Comptes locaux » (section Securite de Parametres). Tout est facultatif et
// desactive par defaut, sauf la longueur minimale du mot de passe. Les valeurs lues sont bornees :
// une config ecrite a la main ne peut pas affaiblir la regle en dessous du plancher.
import { loadConfig } from "../config.js";
import { SETTING_KIND, type PluginSettings } from "../plugin-types.js";

export const PLUGIN_ID = "local-accounts";

/** Double authentification : desactivee, facultative, exigee pour les operateurs, exigee pour tous. */
export const TOTP_POLICY = { off: "off", optional: "optional", operators: "operators", all: "all" } as const;
export type TotpPolicy = (typeof TOTP_POLICY)[keyof typeof TOTP_POLICY];

export type LocalAccountsSettings = {
  captcha: boolean;
  lockout: { enabled: boolean; maxFailures: number; minutes: number };
  totp: TotpPolicy;
  passwordMinLength: number;
};

export const PASSWORD_MIN_FLOOR = 8;
export const LOCAL_ACCOUNTS_DEFAULTS: LocalAccountsSettings = {
  captcha: false,
  lockout: { enabled: false, maxFailures: 5, minutes: 15 },
  totp: TOTP_POLICY.off,
  passwordMinLength: PASSWORD_MIN_FLOOR,
};

const clampInt = (v: unknown, min: number, max: number, def: number): number => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

export function normalizeLocalAccountsSettings(raw: unknown): LocalAccountsSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const lo = (r.lockout && typeof r.lockout === "object" ? r.lockout : {}) as Record<string, unknown>;
  const d = LOCAL_ACCOUNTS_DEFAULTS;
  const policies = Object.values(TOTP_POLICY) as string[];
  return {
    captcha: r.captcha === true,
    lockout: {
      enabled: lo.enabled === true,
      maxFailures: clampInt(lo.maxFailures, 3, 20, d.lockout.maxFailures),
      minutes: clampInt(lo.minutes, 1, 1440, d.lockout.minutes),
    },
    totp: policies.includes(String(r.totp)) ? (r.totp as TotpPolicy) : d.totp,
    passwordMinLength: clampInt(r.passwordMinLength, PASSWORD_MIN_FLOOR, 128, d.passwordMinLength),
  };
}

/** Reglages courants, lus dans la config de l'instance. Plugin desactive : ses regles ne s'appliquent
 *  plus (valeurs par defaut), sinon un captcha ou une 2FA resteraient imposes sans ecran pour les regler. */
export function localAccountsSettings(): LocalAccountsSettings {
  const cfg = loadConfig();
  if (cfg?.plugins && !cfg.plugins.includes(PLUGIN_ID)) return LOCAL_ACCOUNTS_DEFAULTS;
  return normalizeLocalAccountsSettings(cfg?.pluginSettings?.[PLUGIN_ID]);
}

export const totpAllowed = (s: LocalAccountsSettings): boolean => s.totp !== TOTP_POLICY.off;
export const totpRequiredFor = (s: LocalAccountsSettings, isOperator: boolean): boolean =>
  s.totp === TOTP_POLICY.all || (s.totp === TOTP_POLICY.operators && isOperator);

/** Ecran de reglages du plugin, DECLARE (le coeur le dessine). Les bornes viennent de la validation. */
export const LOCAL_ACCOUNTS_SETTINGS: PluginSettings = {
  fields: [
    { key: "captcha", kind: SETTING_KIND.toggle, label: { fr: "Captcha à la connexion", en: "Captcha at sign-in" } },
    { key: "lockoutEnabled", kind: SETTING_KIND.toggle, label: { fr: "Bloquer un compte après plusieurs échecs", en: "Lock an account after several failures" } },
    { key: "lockoutMaxFailures", kind: SETTING_KIND.number, min: 3, max: 20, under: "lockoutEnabled", label: { fr: "Nombre d'échecs", en: "Failures" } },
    { key: "lockoutMinutes", kind: SETTING_KIND.number, min: 1, max: 1440, under: "lockoutEnabled", label: { fr: "Durée du blocage (minutes)", en: "Lock duration (minutes)" } },
    { key: "totp", kind: SETTING_KIND.choice, label: { fr: "Double authentification", en: "Two-factor authentication" },
      hint: { fr: "Code à 6 chiffres d'une appli d'authentification, activé par chacun dans Compte.", en: "6-digit code from an authenticator app, enabled by each user in Account." },
      options: [
        { value: TOTP_POLICY.off, label: { fr: "Désactivée", en: "Disabled" } },
        { value: TOTP_POLICY.optional, label: { fr: "Facultative", en: "Optional" } },
        { value: TOTP_POLICY.operators, label: { fr: "Exigée pour les opérateurs", en: "Required for operators" } },
        { value: TOTP_POLICY.all, label: { fr: "Exigée pour tous", en: "Required for everyone" } },
      ] },
    { key: "passwordMinLength", kind: SETTING_KIND.number, min: PASSWORD_MIN_FLOOR, max: 128, label: { fr: "Longueur minimale du mot de passe", en: "Minimum password length" } },
  ],
  toForm(stored) {
    const s = normalizeLocalAccountsSettings(stored);
    return { captcha: s.captcha, lockoutEnabled: s.lockout.enabled, lockoutMaxFailures: s.lockout.maxFailures, lockoutMinutes: s.lockout.minutes, totp: s.totp, passwordMinLength: s.passwordMinLength };
  },
  fromForm(b) {
    return normalizeLocalAccountsSettings({
      captcha: b.captcha === true,
      lockout: { enabled: b.lockoutEnabled === true, maxFailures: b.lockoutMaxFailures, minutes: b.lockoutMinutes },
      totp: b.totp, passwordMinLength: b.passwordMinLength,
    });
  },
};
