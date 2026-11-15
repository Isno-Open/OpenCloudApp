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

test("annuaire : materiel achete garde en memoire par compte ; incomplet ecarte ; une lecture en echec ne l'efface pas", async () => {
  const { readDirectory, accountHardware } = await import("./plugins/external-auth.js");
  const api = { defaultCap: 5, ensureAccount: (): Promise<void> => Promise.resolve(), reconcileAccounts: (): Promise<number> => Promise.resolve(0) };
  const super1 = { sku: "ISNO-SUPER", label: "ISNO Super", quantity: 1, invoice: "FA2610-0001", date: "2026-10-07T10:00:00.000Z", status: "delivered" };
  const body = { accounts: [
    { email: "Client@Site.fr", hardware: [super1, { sku: "ISNO-SUPER", invoice: "", date: "2026-10-07" }, { sku: "X", invoice: "F", date: "pas une date" }] },
    { email: "rien@site.fr" },
  ] };
  const get = (): Promise<Response> => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  assert.equal(await readDirectory(api, "https://site.fr/annuaire", "cle", 0, get), 2);
  assert.deepEqual(accountHardware("client@site.fr"), [super1], "seule la ligne complete est gardee, e-mail sans casse");
  assert.deepEqual(accountHardware("rien@site.fr"), []);
  const down = (): Promise<Response> => Promise.resolve(new Response("", { status: 502 }));
  await readDirectory(api, "https://site.fr/annuaire", "cle", 0, down);
  assert.equal(accountHardware("client@site.fr").length, 1, "annuaire injoignable : la derniere lecture reste");
});
