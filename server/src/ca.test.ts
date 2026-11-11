import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const dir = mkdtempSync(join(tmpdir(), "isno-ca-"));
execFileSync("openssl", ["genrsa", "-out", join(dir, "ca.key"), "2048"], { stdio: "ignore" });
execFileSync("openssl", ["req", "-x509", "-new", "-nodes", "-key", join(dir, "ca.key"), "-sha256",
  "-days", "3650", "-subj", "/CN=Test CA", "-out", join(dir, "ca.crt")], { stdio: "ignore" });
process.env.CERTS_DIR = dir;
const { issueDeviceCert } = await import("./ca.js");

test("issueDeviceCert émet un bundle CA + cert + clé", () => {
  const b = issueDeviceCert("opf-abc123");
  assert.match(b.ca, /BEGIN CERTIFICATE/);
  assert.match(b.cert, /BEGIN CERTIFICATE/);
  assert.match(b.key, /BEGIN (RSA )?PRIVATE KEY/);
});
test("le CN du cert = le deviceId (segment d'isolation ACL)", () => {
  const b = issueDeviceCert("opf-cn-check");
  const f = join(dir, "c.crt"); writeFileSync(f, b.cert);
  const subj = execFileSync("openssl", ["x509", "-in", f, "-noout", "-subject"], { encoding: "utf8" });
  assert.match(subj, /CN\s*=\s*opf-cn-check/);
});
test("le cert est bien signé par la CA (openssl verify)", () => {
  const b = issueDeviceCert("opf-verify");
  const f = join(dir, "v.crt"); writeFileSync(f, b.cert);
  assert.match(execFileSync("openssl", ["verify", "-CAfile", join(dir, "ca.crt"), f], { encoding: "utf8" }), /OK/);
});
