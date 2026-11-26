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
    closeAccounts: (): Promise<number> => Promise.resolve(0),
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
  const api = { defaultCap: 5, ensureAccount: (): Promise<void> => Promise.resolve(), reconcileAccounts: (): Promise<number> => Promise.resolve(0), closeAccounts: (): Promise<number> => Promise.resolve(0) };
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

test("annuaire : un compte ferme par son titulaire est retire, pas recree, et se rouvre quand l'annuaire ne le dit plus ferme", async () => {
  const { readDirectory, isClosedAccount } = await import("./plugins/external-auth.js");
  const created: string[] = [];
  let closed: readonly string[] | null = null, present: readonly string[] | null = null;
  const api = {
    defaultCap: 5,
    ensureAccount: (id: string): Promise<void> => { created.push(id); return Promise.resolve(); },
    reconcileAccounts: (ids: readonly string[]): Promise<number> => { present = ids; return Promise.resolve(0); },
    closeAccounts: (ids: readonly string[]): Promise<number> => { closed = ids; return Promise.resolve(ids.length); },
  };
  const reply = (body: object) => (): Promise<Response> => Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));
  // la fermeture l'emporte, meme si le compte figure encore dans la liste (il a des commandes)
  const body = { accounts: [{ email: "ouvert@site.fr" }, { email: "ferme@site.fr" }], closed: ["Ferme@Site.fr", "pas une adresse", 12] };
  assert.equal(await readDirectory(api, "https://site.fr/annuaire", "cle", 0, reply(body)), 1);
  assert.deepEqual(closed, ["ferme@site.fr"], "seules les adresses valides, sans casse");
  assert.deepEqual(created, ["ouvert@site.fr"], "un compte ferme n'est pas recree");
  assert.deepEqual(present, ["ouvert@site.fr"]);
  assert.equal(isClosedAccount("FERME@site.fr"), true);
  assert.equal(isClosedAccount("ouvert@site.fr"), false);
  // annuaire injoignable : ce qu'on savait reste (un compte ferme ne se rouvre pas sur une panne)
  await readDirectory(api, "https://site.fr/annuaire", "cle", 0, (): Promise<Response> => Promise.resolve(new Response("", { status: 502 })));
  assert.equal(isClosedAccount("ferme@site.fr"), true);
  // le titulaire l'a rouvert : l'annuaire ne le dit plus ferme, il redevient un compte ordinaire
  assert.equal(await readDirectory(api, "https://site.fr/annuaire", "cle", 0, reply({ accounts: [{ email: "ferme@site.fr" }] })), 1);
  assert.equal(isClosedAccount("ferme@site.fr"), false);
  assert.deepEqual(closed, []);
});
