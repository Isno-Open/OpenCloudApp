// src/lib/login.ts
var LOGIN_ERROR = {
	bad: "1",
	captcha: "captcha",
	locked: "locked",
	totp: "totp",
	expired: "expired"
};
var LOGIN_STEP = { totp: "totp" };
/** Informations affichees sur la page de connexion (?ok=). */
var LOGIN_INFO = { passwordSet: "password" };
/** Lit le parametre ?e= sans assertion de type : seule une valeur de l'enumeration est retenue. */
var parseLoginError = (v) => Object.values(LOGIN_ERROR).find((x) => x === v) ?? null;
export { parseLoginError as i, LOGIN_INFO as n, LOGIN_STEP as r, LOGIN_ERROR as t };
