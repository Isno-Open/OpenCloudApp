// Issues d'une tentative de connexion (parametre ?e= de la page), et etape de double authentification.
export const LOGIN_ERROR = { bad: '1', captcha: 'captcha', locked: 'locked', totp: 'totp', expired: 'expired' } as const;
export type LoginError = (typeof LOGIN_ERROR)[keyof typeof LOGIN_ERROR];
export const LOGIN_STEP = { totp: 'totp' } as const;

/** Lit le parametre ?e= sans assertion de type : seule une valeur de l'enumeration est retenue. */
export const parseLoginError = (v: string | null): LoginError | null => Object.values(LOGIN_ERROR).find((x) => x === v) ?? null;
