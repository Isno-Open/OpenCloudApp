// Variantes de bouton (classes de cloud.css), declarees une fois.
export const BUTTON = { primary: 'primary', ghost: 'ghost', danger: 'danger' } as const;
export type ButtonVariant = (typeof BUTTON)[keyof typeof BUTTON];
