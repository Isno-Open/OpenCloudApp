import { randomBytes, randomInt } from "node:crypto";
// ../server/dist/device-code.js
var USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
var newDeviceCode = () => randomBytes(32).toString("hex");
function newUserCode() {
	let c = "";
	for (let i = 0; i < 8; i++) c += USER_CODE_ALPHABET[randomInt(31)];
	return c;
}
/** Saisie utilisateur -> forme canonique (majuscules, hors alphabet retiré). Rend null si invalide. */
function normalizeUserCode(input) {
	const c = input.toUpperCase().split("").filter((ch) => USER_CODE_ALPHABET.includes(ch)).join("");
	return c.length === 8 ? c : null;
}
/** Forme d'affichage « XXXX-XXXX ». */
var displayUserCode = (c) => `${c.slice(0, 4)}-${c.slice(4)}`;
/** Statut rendu à l'appareil qui interroge (valeur sur le fil, lue par le firmware). */
var POLL_STATUS = {
	pending: "pending",
	ready: "ready",
	expired: "expired",
	denied: "denied"
};
export { normalizeUserCode as a, newUserCode as i, displayUserCode as n, newDeviceCode as r, POLL_STATUS as t };
