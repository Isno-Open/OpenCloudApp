import { o as loadConfig } from "./config_2VUiG471.mjs";
// ../server/dist/plugin-contract.js
/** Nature d'un reglage, donc du controle dessine par le coeur. */
var SETTING_KIND = {
	toggle: "toggle",
	number: "number",
	choice: "choice"
};
// ../server/dist/plugins/local-accounts-settings.js
var PLUGIN_ID = "local-accounts";
/** Double authentification : desactivee, facultative, exigee pour les operateurs, exigee pour tous. */
var TOTP_POLICY = {
	off: "off",
	optional: "optional",
	operators: "operators",
	all: "all"
};
var LOCAL_ACCOUNTS_DEFAULTS = {
	captcha: false,
	lockout: {
		enabled: false,
		maxFailures: 5,
		minutes: 15
	},
	totp: TOTP_POLICY.off,
	passwordMinLength: 8
};
var clampInt = (v, min, max, def) => {
	const n = Math.round(Number(v));
	return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};
function normalizeLocalAccountsSettings(raw) {
	const r = raw && typeof raw === "object" ? raw : {};
	const lo = r.lockout && typeof r.lockout === "object" ? r.lockout : {};
	const d = LOCAL_ACCOUNTS_DEFAULTS;
	const policies = Object.values(TOTP_POLICY);
	return {
		captcha: r.captcha === true,
		lockout: {
			enabled: lo.enabled === true,
			maxFailures: clampInt(lo.maxFailures, 3, 20, d.lockout.maxFailures),
			minutes: clampInt(lo.minutes, 1, 1440, d.lockout.minutes)
		},
		totp: policies.includes(String(r.totp)) ? r.totp : d.totp,
		passwordMinLength: clampInt(r.passwordMinLength, 8, 128, d.passwordMinLength)
	};
}
/** Reglages courants, lus dans la config de l'instance. Plugin desactive : ses regles ne s'appliquent
*  plus (valeurs par defaut), sinon un captcha ou une 2FA resteraient imposes sans ecran pour les regler. */
function localAccountsSettings() {
	const cfg = loadConfig();
	if (cfg?.plugins && !cfg.plugins.includes("local-accounts")) return LOCAL_ACCOUNTS_DEFAULTS;
	return normalizeLocalAccountsSettings(cfg?.pluginSettings?.[PLUGIN_ID]);
}
var totpAllowed = (s) => s.totp !== TOTP_POLICY.off;
var totpRequiredFor = (s, isOperator) => s.totp === TOTP_POLICY.all || s.totp === TOTP_POLICY.operators && isOperator;
/** Ecran de reglages du plugin, DECLARE (le coeur le dessine). Les bornes viennent de la validation. */
var LOCAL_ACCOUNTS_SETTINGS = {
	fields: [
		{
			key: "captcha",
			kind: SETTING_KIND.toggle,
			label: {
				fr: "Captcha à la connexion",
				en: "Captcha at sign-in"
			}
		},
		{
			key: "lockoutEnabled",
			kind: SETTING_KIND.toggle,
			label: {
				fr: "Bloquer un compte après plusieurs échecs",
				en: "Lock an account after several failures"
			}
		},
		{
			key: "lockoutMaxFailures",
			kind: SETTING_KIND.number,
			min: 3,
			max: 20,
			under: "lockoutEnabled",
			label: {
				fr: "Nombre d'échecs",
				en: "Failures"
			}
		},
		{
			key: "lockoutMinutes",
			kind: SETTING_KIND.number,
			min: 1,
			max: 1440,
			under: "lockoutEnabled",
			label: {
				fr: "Durée du blocage (minutes)",
				en: "Lock duration (minutes)"
			}
		},
		{
			key: "totp",
			kind: SETTING_KIND.choice,
			label: {
				fr: "Double authentification",
				en: "Two-factor authentication"
			},
			hint: {
				fr: "Code à 6 chiffres d'une appli d'authentification, activé par chacun dans Compte.",
				en: "6-digit code from an authenticator app, enabled by each user in Account."
			},
			options: [
				{
					value: TOTP_POLICY.off,
					label: {
						fr: "Désactivée",
						en: "Disabled"
					}
				},
				{
					value: TOTP_POLICY.optional,
					label: {
						fr: "Facultative",
						en: "Optional"
					}
				},
				{
					value: TOTP_POLICY.operators,
					label: {
						fr: "Exigée pour les opérateurs",
						en: "Required for operators"
					}
				},
				{
					value: TOTP_POLICY.all,
					label: {
						fr: "Exigée pour tous",
						en: "Required for everyone"
					}
				}
			]
		},
		{
			key: "passwordMinLength",
			kind: SETTING_KIND.number,
			min: 8,
			max: 128,
			label: {
				fr: "Longueur minimale du mot de passe",
				en: "Minimum password length"
			}
		}
	],
	toForm(stored) {
		const s = normalizeLocalAccountsSettings(stored);
		return {
			captcha: s.captcha,
			lockoutEnabled: s.lockout.enabled,
			lockoutMaxFailures: s.lockout.maxFailures,
			lockoutMinutes: s.lockout.minutes,
			totp: s.totp,
			passwordMinLength: s.passwordMinLength
		};
	},
	fromForm(b) {
		return normalizeLocalAccountsSettings({
			captcha: b.captcha === true,
			lockout: {
				enabled: b.lockoutEnabled === true,
				maxFailures: b.lockoutMaxFailures,
				minutes: b.lockoutMinutes
			},
			totp: b.totp,
			passwordMinLength: b.passwordMinLength
		});
	}
};
export { totpRequiredFor as a, totpAllowed as i, PLUGIN_ID as n, SETTING_KIND as o, localAccountsSettings as r, LOCAL_ACCOUNTS_SETTINGS as t };
