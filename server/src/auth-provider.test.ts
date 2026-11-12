import { test } from "node:test";
import assert from "node:assert/strict";
import { registerAuthProvider, resolveAccount, externalLoginUrl, clearAuthProviders, type AuthProvider } from "./auth-provider.js";

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