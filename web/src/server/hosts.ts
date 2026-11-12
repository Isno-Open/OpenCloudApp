// Noms d'hote publics de l'instance : valeurs proposees a l'installation et verification qu'ils existent.
// Le portail se demande en NOM D'HOTE seulement (le protocole vient de la requete) ; le broker aussi (son
// port est BROKER_PUBLIC_PORT, la meme variable que la redirection de port du compose).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { X509Certificate, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { connect as tlsConnect } from 'node:tls';

const CERTS_DIR = process.env.CERTS_DIR ?? '/certs';
export const BROKER_PUBLIC_PORT = Number(process.env.BROKER_PUBLIC_PORT ?? 8883);

/** Identifiant aleatoire de CE process : prouve qu'une URL publique mene bien a cette instance. */
export const INSTANCE_NONCE = randomBytes(16).toString('hex');

// Noms internes du certificat du broker (reseau de la pile), jamais un nom public.
const INTERNAL_NAMES = new Set(['broker', 'localhost']);

/** Noms DNS publics inscrits dans le certificat du broker (SAN), dans l'ordre. */
export function brokerCertNames(): string[] {
  try {
    const san = new X509Certificate(readFileSync(join(CERTS_DIR, 'server.crt'))).subjectAltName ?? '';
    return san.split(',').map((s) => s.trim()).filter((s) => s.startsWith('DNS:')).map((s) => s.slice(4).toLowerCase())
      .filter((n) => !INTERNAL_NAMES.has(n));
  } catch { return []; }
}

// nom d'hote, eventuellement suivi d'un port (cas d'une instance de test sur un port local)
const HOST_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*(:[0-9]{1,5})?$/;
export const normalizeHost = (h: string): string | null => {
  const v = h.trim().toLowerCase().replace(/^[a-z]+:\/\//, '').replace(/\/.*$/, '');
  return HOST_RE.test(v) ? v : null;
};

export const HOST_CHECK = {
  appFormat: 'appFormat', appDns: 'appDns', appReach: 'appReach',
  brokerFormat: 'brokerFormat', brokerDns: 'brokerDns', brokerCert: 'brokerCert', brokerPort: 'brokerPort',
} as const;
export type HostCheck = (typeof HOST_CHECK)[keyof typeof HOST_CHECK];
export type CheckResult = { check: HostCheck; ok: boolean; detail: string };

/** Empreinte du certificat de NOTRE broker (fichier local). */
const localBrokerFingerprint = (): string | null => {
  try { return new X509Certificate(readFileSync(join(CERTS_DIR, 'server.crt'))).fingerprint256; } catch { return null; }
};
/** Ouvre une connexion TLS vers host:port et rend l'empreinte du certificat presente (null si injoignable).
 *  Le broker exige un certificat client, mais il presente le sien avant : c'est lui qu'on compare. */
const remoteFingerprint = (host: string, port: number, ms = 5000): Promise<string | null> => new Promise((res) => {
  const s = tlsConnect({ host, port, servername: host, rejectUnauthorized: false });
  const done = (v: string | null) => { s.destroy(); res(v); };
  s.setTimeout(ms, () => done(null));
  s.once('secureConnect', () => done(s.getPeerX509Certificate()?.fingerprint256 ?? null));
  s.once('error', () => done(null));
});
const resolves = async (host: string): Promise<string | null> => {
  try { return (await lookup(host.replace(/:\d+$/, ''))).address; } catch { return null; }
};

/** Verifie les deux noms ; chaque point est rendu, pour un message precis en cas d'echec. */
export async function checkHosts(appHost: string, brokerHost: string, scheme: string): Promise<{ ok: boolean; checks: CheckResult[] }> {
  const checks: CheckResult[] = [];
  const app = normalizeHost(appHost), broker = normalizeHost(brokerHost);
  checks.push({ check: HOST_CHECK.appFormat, ok: !!app, detail: app ?? 'nom d\'hôte invalide' });
  checks.push({ check: HOST_CHECK.brokerFormat, ok: !!broker, detail: broker ?? 'nom d\'hôte invalide' });
  if (app) {
    const ip = await resolves(app);
    checks.push({ check: HOST_CHECK.appDns, ok: !!ip, detail: ip ? `résout vers ${ip}` : 'ne se résout pas (DNS)' });
    if (ip) {
      let reach = 'injoignable';
      try {
        const r = await fetch(`${scheme}://${app}/api/setup/whoami`, { signal: AbortSignal.timeout(6000) });
        const d = (await r.json().catch(() => ({}))) as { nonce?: string };
        reach = d.nonce === INSTANCE_NONCE ? 'mène bien à cette instance'
          : d.nonce ? 'répond, mais mène à une AUTRE instance' : 'répond, mais ce n\'est pas ce portail';
      } catch (e) { reach = `injoignable (${e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)})`; }
      checks.push({ check: HOST_CHECK.appReach, ok: reach === 'mène bien à cette instance', detail: `${scheme}://${app} ${reach}` });
    }
  }
  if (broker) {
    const names = brokerCertNames();
    const inCert = names.includes(broker);
    checks.push({ check: HOST_CHECK.brokerCert, ok: inCert, detail: inCert ? 'présent dans le certificat du broker'
      : names.length ? `absent du certificat (qui contient : ${names.join(', ')})` : 'certificat du broker introuvable' });
    const ip = await resolves(broker);
    checks.push({ check: HOST_CHECK.brokerDns, ok: !!ip, detail: ip ? `résout vers ${ip}` : 'ne se résout pas (DNS)' });
    if (ip) {
      // preuve que le nom mene a NOTRE broker : le certificat presente doit etre le notre
      const remote = await remoteFingerprint(broker, BROKER_PUBLIC_PORT), local = localBrokerFingerprint();
      const same = !!remote && remote === local;
      checks.push({ check: HOST_CHECK.brokerPort, ok: same, detail: !remote ? `port ${BROKER_PUBLIC_PORT} injoignable ou fermé`
        : same ? `${broker}:${BROKER_PUBLIC_PORT} mène bien au broker de cette instance` : `${broker}:${BROKER_PUBLIC_PORT} répond, mais avec un AUTRE certificat (autre serveur)` });
    }
  }
  return { ok: checks.every((c) => c.ok), checks };
}

/** Protocole public de la requete (derriere un reverse-proxy : X-Forwarded-Proto). */
export const requestScheme = (request: Request): string =>
  (request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '')).split(',')[0]!.trim();
