import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExternalAuth, EXTERNAL_AUTH_DEFAULTS } from "./plugins/external-auth.js";

test("reglages : https seulement, nom et domaine de cookie bornes, le reste remplace par defaut", () => {
  assert.deepEqual(normalizeExternalAuth({ loginUrl: "https://a.fr/compte", logoutUrl: "https://a.fr/sortie", cookieName: "isno_account", cookieDomain: ".A.fr", directoryUrl: "https://a.fr/annuaire" }),
    { loginUrl: "https://a.fr/compte", logoutUrl: "https://a.fr/sortie", cookieName: "isno_account", cookieDomain: ".a.fr", directoryUrl: "https://a.fr/annuaire" });
  assert.deepEqual(normalizeExternalAuth({ loginUrl: "http://a.fr/", logoutUrl: "javascript:alert(1)", cookieName: "a b;", cookieDomain: "evil;Domain=x", directoryUrl: "http://a.fr/annuaire" }),
    { ...EXTERNAL_AUTH_DEFAULTS });
  assert.deepEqual(normalizeExternalAuth(null), { ...EXTERNAL_AUTH_DEFAULTS });
});

test("annuaire : chaque entree cree son compte, puis les absents sont rapproches (jamais supprimes)", async () => {
  const { readDirectory } = await import("./plugins/external-auth.js");
  const created: string[] = [];
  let present: readonly string[] | null = null;
  const api = {
    defaultCap: 5,
    ensureAccount: (id: string): Promise<void> => { created.push(id); return Promise.resolve(); },
    reconcileAccounts: (ids: readonly string[]): Promise<number> => { present = ids; return Promise.resolve(0); },
  };
  const body = { accounts: [{ email: "a@site.fr", name: "A" }, { email: "b@site.fr" }] };
  const get = (): Promise<Response> => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  assert.equal(await readDirectory(api, "https://site.fr/annuaire", "cle", 0, get), 2);
  assert.deepEqual(created, ["a@site.fr", "b@site.fr"]);
  assert.deepEqual(present, ["a@site.fr", "b@site.fr"]);
  // lecture en echec : rien n'est rapproche (sinon tous les comptes seraient marques absents)
  present = null;
  const down = (): Promise<Response> => Promise.resolve(new Response("", { status: 502 }));
  assert.equal(await readDirectory(api, "https://site.fr/annuaire", "cle", 0, down), null);
  assert.equal(present, null);
});
