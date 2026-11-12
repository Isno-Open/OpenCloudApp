// src/lib/validate.ts
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var normalizeEmail = (v) => {
	const e = String(v ?? "").trim().toLowerCase();
	return EMAIL_RE.test(e) && e.length <= 254 ? e : null;
};
var normalizeName = (v) => {
	const n = String(v ?? "").trim().replace(/\s+/g, " ");
	return n.length >= 1 && n.length <= 80 ? n : null;
};
export { normalizeName as n, normalizeEmail as t };
