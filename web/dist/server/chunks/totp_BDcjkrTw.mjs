import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
// ../server/dist/totp.js
var B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf) {
	let bits = 0, value = 0, out = "";
	for (const byte of buf) {
		value = value << 8 | byte;
		bits += 8;
		while (bits >= 5) {
			out += B32[value >>> bits - 5 & 31];
			bits -= 5;
		}
	}
	if (bits > 0) out += B32[value << 5 - bits & 31];
	return out;
}
function base32Decode(s) {
	const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
	let bits = 0, value = 0;
	const out = [];
	for (const ch of clean) {
		value = value << 5 | B32.indexOf(ch);
		bits += 5;
		if (bits >= 8) {
			out.push(value >>> bits - 8 & 255);
			bits -= 8;
		}
	}
	return Buffer.from(out);
}
/** Nouveau secret (20 octets, comme le recommande la RFC 4226), en base32. */
var newTotpSecret = () => base32Encode(randomBytes(20));
/** Code HOTP pour un compteur donne. */
function hotp(secret, counter, digits = 6) {
	const msg = Buffer.alloc(8);
	msg.writeBigUInt64BE(BigInt(counter));
	const h = createHmac("sha1", secret).update(msg).digest();
	const off = h[h.length - 1] & 15;
	const bin = (h[off] & 127) << 24 | h[off + 1] << 16 | h[off + 2] << 8 | h[off + 3];
	return String(bin % 10 ** digits).padStart(digits, "0");
}
var totpStep = (nowMs) => Math.floor(nowMs / 1e3 / 30);
/** Verifie un code ; rend le pas de temps accepte (pour refuser un code deja utilise), ou null.
*  Tolere un pas d'ecart (horloge du telephone un peu decalee). */
function verifyTotp(secretB32, code, nowMs, lastUsedStep = null) {
	const c = code.replace(/\s/g, "");
	if (!/^\d{6}$/.test(c)) return null;
	const secret = base32Decode(secretB32);
	const now = totpStep(nowMs);
	for (const step of [
		now,
		now - 1,
		now + 1
	]) {
		if (lastUsedStep !== null && step <= lastUsedStep) continue;
		const want = hotp(secret, step);
		if (timingSafeEqual(Buffer.from(want), Buffer.from(c))) return step;
	}
	return null;
}
/** URI a encoder en QR pour l'appli d'authentification. */
var otpauthUri = (issuer, account, secretB32) => `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(account)}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
export { otpauthUri as n, verifyTotp as r, newTotpSecret as t };
