// Forme d'une adresse e-mail (identifiant de connexion de tous les comptes). Une seule regle, partagee.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const normalizeEmail = (v: unknown): string | null => {
  const e = String(v ?? '').trim().toLowerCase();
  return EMAIL_RE.test(e) && e.length <= 254 ? e : null;
};
export const normalizeName = (v: unknown): string | null => {
  const n = String(v ?? '').trim().replace(/\s+/g, ' ');
  return n.length >= 1 && n.length <= 80 ? n : null;
};
