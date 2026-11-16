// Nom d'un boitier dans un compte : unique, pour qu'on reconnaisse lequel est lequel (sur le portail
// et sur le boitier lui-meme, qui affiche ce nom). Deux noms sont « le meme » sans tenir compte des
// majuscules, des accents composes differemment ni des espaces autour.
export const BOX_NAME_ERROR = { taken: 'name_taken' } as const;
export type BoxNameError = (typeof BOX_NAME_ERROR)[keyof typeof BOX_NAME_ERROR];

/** Forme de comparaison d'un nom de boitier. */
export const boxNameKey = (name: string): string => name.normalize('NFC').trim().toLocaleLowerCase('fr');
