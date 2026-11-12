import { createHash, createHmac, timingSafeEqual } from "node:crypto";
// ../server/dist/account-token.js
var ACCOUNT_TOKEN = {
	invite: "invite",
	reset: "reset"
};
var ACCOUNT_TOKEN_TTL_MS = {
	[ACCOUNT_TOKEN.invite]: 6048e5,
	[ACCOUNT_TOKEN.reset]: 36e5
};
var fingerprint = (passHash) => createHash("sha256").update(passHash ?? "none").digest("hex").slice(0, 16);
var sign = (key, body) => createHmac("sha256", key).update(`account-token\0${body}`).digest("base64url");
function makeAccountToken(key, purpose, accountId, passHash, now = Date.now()) {
	const body = Buffer.from(JSON.stringify({
		p: purpose,
		id: accountId,
		exp: now + ACCOUNT_TOKEN_TTL_MS[purpose],
		f: fingerprint(passHash)
	})).toString("base64url");
	return `${body}.${sign(key, body)}`;
}
/** Compte vise si la signature, l'usage et la date sont bons (SANS l'empreinte du mot de passe : on lit
*  ensuite ce compte en base, puis readAccountToken tranche). */
function peekAccountToken(key, token, purpose, now = Date.now()) {
	const i = token.lastIndexOf(".");
	if (i < 0) return null;
	const body = token.slice(0, i), sig = token.slice(i + 1), want = sign(key, body);
	if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
	try {
		const d = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
		if (!d || typeof d !== "object") return null;
		const r = d;
		return r.p === purpose && typeof r.id === "string" && Number(r.exp) > now ? r.id : null;
	} catch {
		return null;
	}
}
/** Compte vise par un jeton valide pour cet usage, ou null. currentPassHash : celui du compte en base. */
function readAccountToken(key, token, purpose, currentPassHash, now = Date.now()) {
	const i = token.lastIndexOf(".");
	if (i < 0) return null;
	const body = token.slice(0, i), sig = token.slice(i + 1), want = sign(key, body);
	if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
	let d;
	try {
		d = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
	} catch {
		return null;
	}
	if (d.p !== purpose || typeof d.id !== "string" || !(Number(d.exp) > now)) return null;
	const cur = currentPassHash(d.id);
	if (cur === void 0) return null;
	return d.f === fingerprint(cur) ? d.id : null;
}
export { readAccountToken as i, makeAccountToken as n, peekAccountToken as r, ACCOUNT_TOKEN as t };
