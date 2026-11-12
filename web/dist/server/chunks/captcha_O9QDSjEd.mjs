import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
// ../server/dist/captcha.js
var ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var LENGTH = 5;
var CAPTCHA_TTL_MS = 6e5;
var sign = (body, key) => createHmac("sha256", key).update(body).digest("base64url");
function newChallenge(key, now = Date.now()) {
	const code = [...randomBytes(LENGTH)].map((b) => ALPHABET[b % 31]).join("");
	const body = `${sign(code, key)}.${now + CAPTCHA_TTL_MS}`;
	return {
		code,
		token: `${body}.${sign(body, key)}`
	};
}
function verifyCaptcha(token, answer, key, now = Date.now()) {
	const parts = token.split(".");
	if (parts.length !== 3) return false;
	const [codeSig, exp, sig] = parts;
	const want = sign(`${codeSig}.${exp}`, key);
	if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return false;
	if (!(Number(exp) > now)) return false;
	const got = sign(answer.trim().toUpperCase(), key);
	return got.length === codeSig.length && timingSafeEqual(Buffer.from(got), Buffer.from(codeSig));
}
/** Le code dessine en SVG, au visuel du /admin d'isno.fr : chaque lettre isolee, de teinte, taille et
*  angle tires au hasard, sur un fond de carte, avec deux courbes et des points comme bruit. Les couleurs
*  de fond suivent le theme (variables CSS) ; le SVG est insere tel quel dans la page. */
function captchaSvg(code) {
	const W = 168, H = 54;
	const glyphs = [...code].map((ch, i) => {
		const x = 16 + i * 30 + randomInt(-3, 4), y = 37 + randomInt(-5, 6), rot = randomInt(-24, 25);
		return `<text x="${x}" y="${y}" font-family="monospace" font-size="${randomInt(24, 31)}" font-weight="700" fill="hsl(${randomInt(170, 230)} 85% 50%)" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
	}).join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="code a recopier"><rect width="${W}" height="${H}" rx="8" style="fill:var(--surface-2)"/>${Array.from({ length: 2 }, () => `<path d="M0 ${randomInt(10, 44)} Q ${W / 2} ${randomInt(-10, 64)} ${W} ${randomInt(10, 44)}" stroke="hsl(${randomInt(185, 216)} 70% 60%)" stroke-width="2" fill="none" opacity=".55"/>`).join("")}${Array.from({ length: 24 }, () => `<circle cx="${randomInt(0, W)}" cy="${randomInt(0, H)}" r="${randomInt(1, 3)}" style="fill:var(--text-muted)" opacity=".5"/>`).join("")}${glyphs}</svg>`;
}
export { newChallenge as n, verifyCaptcha as r, captchaSvg as t };
