import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAuthProvider, resolveAccount, externalLoginUrl, logoutCookies, clearAuthProviders, localProvider, type AuthProvider } from "./auth-provider.js";

test("registre : premier provider qui rend un compte gagne, dédup par id", async () => {
  clearAuthProviders();
  const a: AuthProvider = { id: "a", resolveAccount: (c) => Promise.resolve(c === "x" ? "compteA" : null) };
  const b: AuthProvider = { id: "b", resolveAccount: () => Promise.resolve("compteB"), loginUrl: () => "https://login" };
  registerAuthProvider(a); registerAuthProvider(b); registerAuthProvider(a);   // le 2e "a" est ignoré (dédup)
  assert.equal(await resolveAccount("x"), "compteA");   // a reconnaît x
  assert.equal(await resolveAccount("y"), "compteB");   // a rend null -> b prend la main
  assert.equal(externalLoginUrl(), "https://login");    // URL externe du 1er provider qui en offre une
});
test("registre : sans provider, pas de compte ni d'URL externe", async () => {
  clearAuthProviders();
  assert.equal(await resolveAccount("x"), null);
  assert.equal(externalLoginUrl(), null);
});
test("deconnexion : les cookies de TOUS les providers sont effaces ensemble", () => {
  clearAuthProviders();
  registerAuthProvider(localProvider);
  registerAuthProvider({ id: "sso-test", resolveAccount: () => Promise.resolve(null), logoutCookies: () => ["sso=; Domain=.exemple.fr; Path=/; Max-Age=0"] });
  const c = logoutCookies();
  assert.ok(c.some((x) => x.startsWith("sid=;") && x.includes("Max-Age=0")));
  assert.ok(c.some((x) => x.startsWith("sso=;") && x.includes("Domain=.exemple.fr")));
});
