import { t as PKI_FILES } from "./pki_DfnIFSmA.mjs";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
// ../server/dist/ca.js
/** Émet {ca, cert, key} pour un device. Le CN = deviceId = segment d'isolation de l'ACL du broker. */
function issueDeviceCert(deviceId) {
	const wd = mkdtempSync(join(tmpdir(), "ael-"));
	try {
		const key = join(wd, "d.key"), csr = join(wd, "d.csr"), crt = join(wd, "d.crt");
		execFileSync("openssl", [
			"genrsa",
			"-out",
			key,
			"2048"
		], { stdio: "ignore" });
		execFileSync("openssl", [
			"req",
			"-new",
			"-key",
			key,
			"-subj",
			`/O=ISNO Cloud/CN=${deviceId}`,
			"-out",
			csr
		], { stdio: "ignore" });
		execFileSync("openssl", [
			"x509",
			"-req",
			"-in",
			csr,
			"-CA",
			PKI_FILES.caCrt,
			"-CAkey",
			PKI_FILES.caKey,
			"-CAcreateserial",
			"-sha256",
			"-days",
			"1825",
			"-out",
			crt
		], { stdio: "ignore" });
		return {
			ca: readFileSync(PKI_FILES.caCrt, "utf8"),
			cert: readFileSync(crt, "utf8"),
			key: readFileSync(key, "utf8")
		};
	} finally {
		rmSync(wd, {
			recursive: true,
			force: true
		});
	}
}
export { issueDeviceCert as t };
