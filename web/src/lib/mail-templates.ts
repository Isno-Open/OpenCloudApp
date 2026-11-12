// E-mails types du portail (texte + HTML), FR/EN. Le contenu varie, la forme est la meme pour tous.
import type { Mail } from '@core/mail.js';
import { LANG, type Lang } from './i18n.ts';

export const MAIL_KIND = { invite: 'invite', reset: 'reset', test: 'test' } as const;
export type MailKind = (typeof MAIL_KIND)[keyof typeof MAIL_KIND];
type Vars = { portal: string; to: string; name?: string | null; link?: string; inviter?: string | null };
type Body = { subject: string; intro: string; action?: string; outro: string };

const T: Record<Lang, Record<MailKind, (v: Vars) => Body>> = {
  [LANG.fr]: {
    [MAIL_KIND.invite]: (v) => ({ subject: `Invitation : ${v.portal}`, intro: `Bonjour${v.name ? ' ' + v.name : ''},\n\n${v.inviter ? v.inviter + ' vous invite' : 'Vous êtes invité(e)'} à rejoindre ${v.portal}, pour piloter vos appareils à distance. Choisissez votre mot de passe pour activer votre compte (${v.to}).`, action: 'Choisir mon mot de passe', outro: 'Ce lien est valable une semaine. Si vous ne vous attendiez pas à cette invitation, ignorez ce message.' }),
    [MAIL_KIND.reset]: (v) => ({ subject: `Mot de passe : ${v.portal}`, intro: `Bonjour${v.name ? ' ' + v.name : ''},\n\nUne réinitialisation du mot de passe a été demandée pour votre compte ${v.to} sur ${v.portal}.`, action: 'Choisir un nouveau mot de passe', outro: "Ce lien est valable une heure et ne sert qu'une fois. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message : votre mot de passe actuel reste valable." }),
    [MAIL_KIND.test]: (v) => ({ subject: `Test de messagerie : ${v.portal}`, intro: `Bonjour,\n\nCe message confirme que la messagerie de ${v.portal} fonctionne.`, outro: 'Aucune action n’est nécessaire.' }),
  },
  [LANG.en]: {
    [MAIL_KIND.invite]: (v) => ({ subject: `Invitation: ${v.portal}`, intro: `Hello${v.name ? ' ' + v.name : ''},\n\n${v.inviter ? v.inviter + ' invites you' : 'You are invited'} to join ${v.portal}, to control your devices remotely. Choose your password to activate your account (${v.to}).`, action: 'Choose my password', outro: "This link is valid for one week. If you weren't expecting this invitation, ignore this message." }),
    [MAIL_KIND.reset]: (v) => ({ subject: `Password: ${v.portal}`, intro: `Hello${v.name ? ' ' + v.name : ''},\n\nA password reset was requested for your account ${v.to} on ${v.portal}.`, action: 'Choose a new password', outro: "This link is valid for one hour and works once. If you didn't request it, ignore this message: your current password still works." }),
    [MAIL_KIND.test]: (v) => ({ subject: `Mail test: ${v.portal}`, intro: `Hello,\n\nThis message confirms that ${v.portal} can send email.`, outro: 'No action needed.' }),
  },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildMail(kind: MailKind, lang: Lang, v: Vars): Mail {
  const b = T[lang][kind](v);
  const text = `${b.intro}\n\n${b.action && v.link ? `${b.action} : ${v.link}\n\n` : ''}${b.outro}\n\n${v.portal}`;
  const paras = b.intro.split('\n\n').map((p) => `<p style="margin:0 0 14px">${esc(p)}</p>`).join('');
  const button = b.action && v.link
    ? `<p style="margin:22px 0"><a href="${esc(v.link)}" style="background:#2e86ff;color:#fff;text-decoration:none;padding:11px 18px;border-radius:9px;font-weight:600;display:inline-block">${esc(b.action)}</a></p><p style="margin:0 0 14px;font-size:12px;color:#6b7a93;word-break:break-all">${esc(v.link)}</p>`
    : '';
  const html = `<!doctype html><html><body style="margin:0;background:#f1f4f9;padding:24px;font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;color:#1b2738">`
    + `<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #dde5f0;border-radius:14px;padding:26px 24px">`
    + `<div style="font-family:ui-monospace,monospace;font-weight:700;font-size:17px;margin-bottom:18px">${esc(v.portal)}</div>`
    + `${paras}${button}<p style="margin:0;font-size:13px;color:#6b7a93">${esc(b.outro)}</p></div></body></html>`;
  return { to: v.to, subject: b.subject, text, html };
}
