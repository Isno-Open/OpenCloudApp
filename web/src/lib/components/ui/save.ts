// Etats d'un enregistrement, declares une fois (SaveMessage et les ecrans).
export const SAVE = { idle: 'idle', pending: 'pending', ok: 'ok', err: 'err' } as const;
export type SaveState = (typeof SAVE)[keyof typeof SAVE];
