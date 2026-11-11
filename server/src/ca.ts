// Émission d'un certificat device signé par la CA du broker. La CA vit dans CERTS_DIR
// (montée, jamais commitée). Le serveur génère la clé ET le cert (modèle "serveur-généré +
// auto-import" côté firmware) : le boîtier reçoit le bundle au pairing, rien à coller.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CERTS_DIR = process.env.CERTS_DIR ?? "/certs";

/** Émet {ca, cert, key} pour un device. Le CN = deviceId = segment d'isolation de l'ACL du broker. */
export function issueDeviceCert(deviceId: string): { ca: string; cert: string; key: string } {
  const wd = mkdtempSync(join(tmpdir(), "ael-"));
  try {
    const key = join(wd, "d.key"), csr = join(wd, "d.csr"), crt = join(wd, "d.crt");
    execFileSync("openssl", ["genrsa", "-out", key, "2048"], { stdio: "ignore" });
    execFileSync("openssl", ["req", "-new", "-key", key, "-subj", `/O=ISNO Cloud/CN=${deviceId}`, "-out", csr], { stdio: "ignore" });
    execFileSync("openssl", ["x509", "-req", "-in", csr, "-CA", join(CERTS_DIR, "ca.crt"),
      "-CAkey", join(CERTS_DIR, "ca.key"), "-CAcreateserial", "-sha256", "-days", "1825", "-out", crt], { stdio: "ignore" });
    return {
      ca: readFileSync(join(CERTS_DIR, "ca.crt"), "utf8"),
      cert: readFileSync(crt, "utf8"),
      key: readFileSync(key, "utf8"),
    };
  } finally {
    rmSync(wd, { recursive: true, force: true });
  }
}
