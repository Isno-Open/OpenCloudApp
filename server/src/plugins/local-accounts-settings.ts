// Reglages du greffon « Comptes locaux » (section Securite de Parametres). Tout est facultatif et
// desactive par defaut, sauf la longueur minimale du mot de passe. Les valeurs lues sont bornees :
// une config ecrite a la main ne peut pas affaiblir la regle en dessous du plancher.
import { loadConfig } from "../config.js";

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

/** Reglages courants, lus dans la config de l'instance. */
export const localAccountsSettings = (): LocalAccountsSettings =>
  normalizeLocalAccountsSettings(loadConfig()?.pluginSettings?.[PLUGIN_ID]);

export const totpAllowed = (s: LocalAccountsSettings): boolean => s.totp !== TOTP_POLICY.off;
export const totpRequiredFor = (s: LocalAccountsSettings, isOperator: boolean): boolean =>
  s.totp === TOTP_POLICY.all || (s.totp === TOTP_POLICY.operators && isOperator);
