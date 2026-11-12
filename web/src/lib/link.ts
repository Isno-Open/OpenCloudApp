// Erreurs de l'approbation d'un appareil (rendues par /api/device/approve, traduites par l'IHM).
export const LINK_ERROR = { auth: 'auth', invalid: 'invalid', cap: 'cap' } as const;
export type LinkError = (typeof LINK_ERROR)[keyof typeof LINK_ERROR];
// Cookie qui garde le code scanne pendant un detour par la connexion (10 min).
export const LINK_COOKIE = 'link_code';
// Etat de la page /lier.
export const LINK_VIEW = { enter: 'enter', confirm: 'confirm', invalid: 'invalid' } as const;
export type LinkView = (typeof LINK_VIEW)[keyof typeof LINK_VIEW];
