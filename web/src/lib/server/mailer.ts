// Envoi des e-mails types par la messagerie du coeur, et liens signes (invitation, reinitialisation).
import { smtpConfig, sendMail } from '@opencloudapp/core/mail.js';
import { makeAccountToken, ACCOUNT_TOKEN, type AccountTokenPurpose } from '@opencloudapp/core/account-token.js';
import { signingKey } from '@opencloudapp/core/session.js';
import { loadConfig } from '@opencloudapp/core/config.js';
import { buildMail, MAIL_KIND, type MailKind } from '#lib/server/mail-templates.ts';
import { ROUTES, type Lang } from '#lib/i18n.ts';
import { portalName } from '#lib/server/portal.ts';

export async function sendTemplated(kind: MailKind, lang: Lang, to: string, vars: { name?: string | null; link?: string; inviter?: string | null } = {}): Promise<{ ok: true } | { ok: false; error: string }> {
  const cfg = smtpConfig();
  if (!cfg) return { ok: false, error: 'messagerie non configurée' };
  try { await sendMail(cfg, buildMail(kind, lang, { portal: portalName(), to, ...vars })); return { ok: true }; }
  catch (e) { return { ok: false, error: e instanceof Error ? e.message : String(e) }; }
}

/** Lien signe vers la page « choisir un mot de passe ». */
export function passwordLink(purpose: AccountTokenPurpose, lang: Lang, accountId: string, passHash: string | null): string {
  const base = (loadConfig()?.publicAppUrl ?? '').replace(/\/$/, '');
  return `${base}${ROUTES.motDePasse[lang]}?t=${encodeURIComponent(makeAccountToken(signingKey(), purpose, accountId, passHash))}`;
}

export const sendInvitation = (lang: Lang, account: { id: string; name: string | null; passHash: string | null }, inviter: string | null) =>
  sendTemplated(MAIL_KIND.invite, lang, account.id, { name: account.name, inviter, link: passwordLink(ACCOUNT_TOKEN.invite, lang, account.id, account.passHash) });
export const sendReset = (lang: Lang, account: { id: string; name: string | null; passHash: string | null }) =>
  sendTemplated(MAIL_KIND.reset, lang, account.id, { name: account.name, link: passwordLink(ACCOUNT_TOKEN.reset, lang, account.id, account.passHash) });
