// Entitlement : l'offre vit sur le COMPTE, plafonnée à N appareils (défaut 5). Au-delà = offre
// payante mensuelle. Un compte peut supprimer des appareils ; l'offre vit avec le compte.
export const DEFAULT_CAP = Number(process.env.DEVICE_CAP ?? 5);
/** true si le compte est au plafond (ne peut plus enrôler). */
export const overCap = (deviceCount: number, cap: number): boolean => deviceCount >= cap;
