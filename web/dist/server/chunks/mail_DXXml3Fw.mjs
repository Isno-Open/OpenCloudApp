import { o as loadConfig } from "./config_2VUiG471.mjs";
import nodemailer from "nodemailer";
// ../server/dist/mail.js
/** Securite de la connexion au serveur SMTP. */
var SMTP_SECURITY = {
	none: "none",
	starttls: "starttls",
	tls: "tls"
};
var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var HOST_RE = /^[a-zA-Z0-9.-]{1,253}$/;
/** Config SMTP validee, ou null si incomplete (hote, port, expediteur obligatoires). */
function normalizeSmtp(raw) {
	const r = raw && typeof raw === "object" ? raw : {};
	const host = String(r.host ?? "").trim(), port = Number(r.port), fromEmail = String(r.fromEmail ?? "").trim();
	const security = Object.values(SMTP_SECURITY).includes(String(r.security)) ? r.security : SMTP_SECURITY.starttls;
	if (!HOST_RE.test(host) || !Number.isInteger(port) || port < 1 || port > 65535 || !EMAIL_RE.test(fromEmail)) return null;
	return {
		host,
		port,
		security,
		user: String(r.user ?? "").trim(),
		pass: String(r.pass ?? ""),
		fromEmail,
		fromName: String(r.fromName ?? "").trim().slice(0, 80)
	};
}
var smtpConfig = () => normalizeSmtp(loadConfig()?.smtp);
var mailEnabled = () => smtpConfig() !== null;
async function sendMail(cfg, m) {
	await nodemailer.createTransport({
		host: cfg.host,
		port: cfg.port,
		secure: cfg.security === SMTP_SECURITY.tls,
		requireTLS: cfg.security === SMTP_SECURITY.starttls,
		ignoreTLS: cfg.security === SMTP_SECURITY.none,
		auth: cfg.user ? {
			user: cfg.user,
			pass: cfg.pass
		} : void 0,
		connectionTimeout: 1e4,
		greetingTimeout: 1e4,
		socketTimeout: 2e4
	}).sendMail({
		from: cfg.fromName ? {
			name: cfg.fromName,
			address: cfg.fromEmail
		} : cfg.fromEmail,
		to: m.to,
		subject: m.subject,
		text: m.text,
		html: m.html
	});
}
export { smtpConfig as a, sendMail as i, mailEnabled as n, normalizeSmtp as r, SMTP_SECURITY as t };
