import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeExternalAuth, EXTERNAL_AUTH_DEFAULTS } from "./plugins/external-auth.js";

test("reglages : https seulement, nom et domaine de cookie bornes, le reste remplace par defaut", () => {
  assert.deepEqual(normalizeExternalAuth({ loginUrl: "https://a.fr/compte", logoutUrl: "https://a.fr/sortie", cookieName: "isno_account", cookieDomain: ".A.fr" }),
    { loginUrl: "https://a.fr/compte", logoutUrl: "https://a.fr/sortie", cookieName: "isno_account", cookieDomain: ".a.fr" });
  assert.deepEqual(normalizeExternalAuth({ loginUrl: "http://a.fr/", logoutUrl: "javascript:alert(1)", cookieName: "a b;", cookieDomain: "evil;Domain=x" }),
    { ...EXTERNAL_AUTH_DEFAULTS });
  assert.deepEqual(normalizeExternalAuth(null), { ...EXTERNAL_AUTH_DEFAULTS });
});
