// Operateur : cree un compte local (identifiant + mot de passe + plafond, operateur ou non).
import type { APIRoute } from 'astro';
import { createAccount, getAccount } from '@core/store.js';
import { hashPass } from '@core/auth.js';
import { requireAdmin } from '../../../server/auth.ts';
import { readBody, json } from '../../../server/http.ts';

const LOGIN_RE = /^[a-zA-Z0-9._@-]{2,64}$/;

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdmin(request))) return json(403, { error: 'forbidden' });
  const b = await readBody(request);
  const login = String(b.login ?? '').trim();
  const password = String(b.password ?? '');
  const cap = Number(b.cap ?? 5);
  if (!LOGIN_RE.test(login)) return json(400, { error: 'identifiant invalide' });
  if (password.length < 8) return json(400, { error: 'mot de passe trop court' });
  if (!Number.isInteger(cap) || cap < 1) return json(400, { error: 'plafond invalide' });
  if (await getAccount(login)) return json(409, { error: 'identifiant déjà pris' });
  await createAccount(login, hashPass(password), cap, b.admin === true);
  return json(200, { ok: true });
};
