// Messagerie du portail (service du coeur, utilisable par tous les greffons) : envoi par le SMTP
// configure dans Parametres. Sans SMTP configure, les fonctions qui en dependent restent masquees.
import nodemailer from "nodemailer";
import { loadConfig } from "./config.js";

/** Securite de la connexion au serveur SMTP. */
export const SMTP_SECURITY = { none: "none", starttls: "starttls", tls: "tls" } as const;
export type SmtpSecurity = (typeof SMTP_SECURITY)[keyof typeof SMTP_SECURITY];

export type SmtpConfig = {
  host: string; port: number; security: SmtpSecurity;
  user: string; pass: string;          // vides : relais sans authentification
  fromEmail: string; fromName: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HOST_RE = /^[a-zA-Z0-9.-]{1,253}$/;

/** Config SMTP validee, ou null si incomplete (hote, port, expediteur obligatoires). */
export function normalizeSmtp(raw: unknown): SmtpConfig | null {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const host = String(r.host ?? "").trim(), port = Number(r.port), fromEmail = String(r.fromEmail ?? "").trim();
  const security = (Object.values(SMTP_SECURITY) as string[]).includes(String(r.security)) ? (r.security as SmtpSecurity) : SMTP_SECURITY.starttls;
  if (!HOST_RE.test(host) || !Number.isInteger(port) || port < 1 || port > 65535 || !EMAIL_RE.test(fromEmail)) return null;
  return { host, port, security, user: String(r.user ?? "").trim(), pass: String(r.pass ?? ""), fromEmail, fromName: String(r.fromName ?? "").trim().slice(0, 80) };
}

export const smtpConfig = (): SmtpConfig | null => normalizeSmtp(loadConfig()?.smtp);
export const mailEnabled = (): boolean => smtpConfig() !== null;

export type Mail = { to: string; subject: string; text: string; html: string };

export async function sendMail(cfg: SmtpConfig, m: Mail): Promise<void> {
  const transport = nodemailer.createTransport({
    host: cfg.host, port: cfg.port,
    secure: cfg.security === SMTP_SECURITY.tls,
    requireTLS: cfg.security === SMTP_SECURITY.starttls,
    ignoreTLS: cfg.security === SMTP_SECURITY.none,
    auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
  });
  await transport.sendMail({ from: cfg.fromName ? { name: cfg.fromName, address: cfg.fromEmail } : cfg.fromEmail, to: m.to, subject: m.subject, text: m.text, html: m.html });
}
