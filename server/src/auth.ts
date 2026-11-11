// Mots de passe : scrypt (sel + hash), vérification en temps constant.
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
export function hashPass(pass: string): string {
  const salt = randomBytes(16);
  return salt.toString("hex") + ":" + scryptSync(pass, salt, 32).toString("hex");
}
export function verifyPass(pass: string, stored: string): boolean {
  const i = stored.indexOf(":");
  if (i < 0) return false;
  const salt = Buffer.from(stored.slice(0, i), "hex");
  const want = Buffer.from(stored.slice(i + 1), "hex");
  const got = scryptSync(pass, salt, 32);
  return got.length === want.length && timingSafeEqual(got, want);
}
