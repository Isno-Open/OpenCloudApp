import { createHmac, timingSafeEqual } from "node:crypto";
// ../server/dist/session.js
var SECRET = process.env.SESSION_SECRET ?? "";
var mac = (v) => createHmac("sha256", SECRET).update(v).digest("hex");
var makeSession = (accountId) => `${accountId}.${mac(accountId)}`;
function readSession(cookie) {
	if (!cookie) return null;
	const m = /(?:^|;\s*)sid=([^;]+)/.exec(cookie);
	if (!m || !m[1]) return null;
	const val = decodeURIComponent(m[1]);
	const i = val.lastIndexOf(".");
	if (i < 0) return null;
	const id = val.slice(0, i), sig = val.slice(i + 1), want = mac(id);
	if (sig.length !== want.length) return null;
	return timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? id : null;
}
var PENDING_TTL_MS = 3e5;
var macCtx = (ctx, v) => createHmac("sha256", SECRET).update(`${ctx}\0${v}`).digest("hex");
function makePending(accountId, now = Date.now()) {
	const body = `${accountId}.${now + PENDING_TTL_MS}`;
	return `${body}.${macCtx("pending", body)}`;
}
function readPending(cookie, now = Date.now()) {
	if (!cookie) return null;
	const m = /(?:^|;\s*)pending=([^;]+)/.exec(cookie);
	if (!m || !m[1]) return null;
	const val = decodeURIComponent(m[1]);
	const i = val.lastIndexOf(".");
	if (i < 0) return null;
	const body = val.slice(0, i), sig = val.slice(i + 1), want = macCtx("pending", body);
	if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
	const j = body.lastIndexOf(".");
	const id = body.slice(0, j);
	return Number(body.slice(j + 1)) > now ? id : null;
}
/** Cle de signature du portail (sert aussi au captcha). */
var signingKey = () => SECRET;
export { readSession as a, readPending as i, makePending as n, signingKey as o, makeSession as r, PENDING_TTL_MS as t };
