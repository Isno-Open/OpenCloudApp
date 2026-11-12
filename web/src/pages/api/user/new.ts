// Operateur : cree un compte local (e-mail + nom + mot de passe + plafond, operateur ou non).
import type { APIRoute } from 'astro';
import { createAccount, getAccount } from '@core/store.js';
import { hashPass } from '@core/auth.js';
import { requireUserAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';
import { normalizeEmail, normalizeName } from '../../../lib/validate.ts';
import { localAccountsSettings } from '@core/plugins/local-accounts-settings.js';


export const POST: APIRoute = async ({ request }) => {
  if (!(await requireUserAdmin(request))) return json(403, { error: 'forbidden' });
  const b = await readBody(request);
  const login = normalizeEmail(b.email), name = normalizeName(b.name);
  const password = String(b.password ?? '');
  const cap = Number(b.cap ?? 5);
  if (!login) return json(400, { error: 'e-mail invalide' });
  if (!name) return json(400, { error: 'nom requis' });
  const min = localAccountsSettings().passwordMinLength;
  if (password.length < min) return json(400, { error: `mot de passe trop court (${min} caractères minimum)` });
  if (!Number.isInteger(cap) || cap < 1) return json(400, { error: 'plafond invalide' });
  if (await getAccount(login)) return json(409, { error: 'e-mail déjà utilisé' });
  await createAccount(login, name, hashPass(password), cap, b.admin === true);
  return json(200, { ok: true });
};
