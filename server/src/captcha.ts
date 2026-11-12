// Captcha de la connexion locale, fabrique ici (meme principe que le /admin de isno.fr) : aucun service
// tiers, aucune donnee de visiteur qui part ailleurs. La reponse ne voyage PAS dans la page : le jeton
// ne porte qu'une empreinte signee du code, et une date limite. Il freine le robot ; c'est le blocage
// apres echecs qui reste la vraie serrure.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";   // ni 0/O ni 1/I/L
const LENGTH = 5;
export const CAPTCHA_TTL_MS = 10 * 60_000;

const sign = (body: string, key: string): string => createHmac("sha256", key).update(body).digest("base64url");

export function newChallenge(key: string, now = Date.now()): { code: string; token: string } {
  const code = [...randomBytes(LENGTH)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
  const body = `${sign(code, key)}.${now + CAPTCHA_TTL_MS}`;
  return { code, token: `${body}.${sign(body, key)}` };
}

export function verifyCaptcha(token: string, answer: string, key: string, now = Date.now()): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [codeSig, exp, sig] = parts as [string, string, string];
  const body = `${codeSig}.${exp}`;
  const want = sign(body, key);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return false;
  if (!(Number(exp) > now)) return false;
  const got = sign(answer.trim().toUpperCase(), key);
  return got.length === codeSig.length && timingSafeEqual(Buffer.from(got), Buffer.from(codeSig));
}

/** Le code dessine en SVG, au visuel du /admin d'isno.fr : chaque lettre isolee, de teinte, taille et
 *  angle tires au hasard, sur un fond de carte, avec deux courbes et des points comme bruit. Les couleurs
 *  de fond suivent le theme (variables CSS) ; le SVG est insere tel quel dans la page. */
export function captchaSvg(code: string): string {
  const W = 168, H = 54;
  const glyphs = [...code].map((ch, i) => {
    const x = 16 + i * 30 + randomInt(-3, 4), y = 37 + randomInt(-5, 6), rot = randomInt(-24, 25), size = randomInt(24, 31), hue = randomInt(170, 230);
    return `<text x="${x}" y="${y}" font-family="monospace" font-size="${size}" font-weight="700" fill="hsl(${hue} 85% 50%)" transform="rotate(${rot} ${x} ${y})">${ch}</text>`;
  }).join("");
  const curves = Array.from({ length: 2 }, () =>
    `<path d="M0 ${randomInt(10, H - 10)} Q ${W / 2} ${randomInt(-10, H + 10)} ${W} ${randomInt(10, H - 10)}" stroke="hsl(${randomInt(185, 216)} 70% 60%)" stroke-width="2" fill="none" opacity=".55"/>`).join("");
  const dots = Array.from({ length: 24 }, () =>
    `<circle cx="${randomInt(0, W)}" cy="${randomInt(0, H)}" r="${randomInt(1, 3)}" style="fill:var(--text-muted)" opacity=".5"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="code a recopier">`
    + `<rect width="${W}" height="${H}" rx="8" style="fill:var(--surface-2)"/>${curves}${dots}${glyphs}</svg>`;
}
