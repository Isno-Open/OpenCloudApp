// Ecrans du mot de passe : demander un lien (oubli) ou en choisir un (depuis un lien signe).
export const PASSWORD_MODE = { forgot: 'forgot', set: 'set' } as const;
export type PasswordMode = (typeof PASSWORD_MODE)[keyof typeof PASSWORD_MODE];
