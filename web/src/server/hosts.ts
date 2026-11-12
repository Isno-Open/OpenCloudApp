// Noms d'hote publics de l'instance : valeurs proposees a l'installation et verification qu'ils existent.
// Le portail se demande en NOM D'HOTE seulement (le protocole vient de la requete) ; le broker aussi (son
// port est BROKER_PUBLIC_PORT, la meme variable que la redirection de port du compose).
import { randomBytes } from 'node:crypto';
import { isIP } from 'node:net';
import { brokerCertNames, brokerCertFingerprint } from '@core/pki.js';
import { lookup } from 'node:dns/promises';
import { connect as tlsConnect } from 'node:tls';

export const BROKER_PUBLIC_PORT = Number(process.env.BROKER_PUBLIC_PORT ?? 8883);

/** Identifiant aleatoire de CE process : prouve qu'une URL publique mene bien a cette instance. */
export const INSTANCE_NONCE = randomBytes(16).toString('hex');

/** Nom propose pour le broker : celui de son certificat s'il existe deja, sinon derive du nom du
 *  portail (app.exemple.fr -> mqtt.exemple.fr ; une IP ou un nom court -> le meme). Modifiable. */
export function suggestBrokerHost(appHost: string): string {
  const fromCert = brokerCertNames()[0];
  if (fromCert) return fromCert;
  const h = appHost.replace(/:\d+$/, '');
  if (isIP(h) || !h.includes('.')) return h;
  const labels = h.split('.');
  return 'mqtt.' + (labels.length > 2 ? labels.slice(1) : labels).join('.');
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

/** Ouvre une connexion TLS vers host:port et rend l'empreinte du certificat presente (null si injoignable).
 *  Le broker exige un certificat client, mais il presente le sien avant : c'est lui qu'on compare. */
const remoteFingerprint = (host: string, port: number, ms = 5000): Promise<string | null> => new Promise((res) => {
  // le nom TLS (SNI) ne peut pas etre une IP : on ne l'envoie que pour un nom DNS (cas d'un reseau local par IP)
  let s: ReturnType<typeof tlsConnect>;
  try { s = tlsConnect({ host, port, ...(isIP(host) ? {} : { servername: host }), rejectUnauthorized: false }); }
  catch { res(null); return; }
  const done = (v: string | null) => { s.destroy(); res(v); };
  s.setTimeout(ms, () => done(null));
  s.once('secureConnect', () => done(s.getPeerX509Certificate()?.fingerprint256 ?? null));
  s.once('error', () => done(null));
});
const resolves = async (host: string): Promise<string | null> => {
  try { return (await lookup(host.replace(/:\d+$/, ''))).address; } catch { return null; }
};

/** DNS puis preuve que le nom mene a CETTE instance (nonce du process). */
async function appReachChecks(app: string, scheme: string): Promise<CheckResult[]> {
  const out: CheckResult[] = [];
  const ip = await resolves(app);
  out.push({ check: HOST_CHECK.appDns, ok: !!ip, detail: ip ? `résout vers ${ip}` : 'ne se résout pas (DNS)' });
  if (!ip) return out;
  let reach = 'injoignable';
  try {
    const r = await fetch(`${scheme}://${app}/api/setup/whoami`, { signal: AbortSignal.timeout(6000) });
    const d = (await r.json().catch(() => ({}))) as { nonce?: string };
    reach = d.nonce === INSTANCE_NONCE ? 'mène bien à cette instance'
      : d.nonce ? 'répond, mais mène à une AUTRE instance' : 'répond, mais ce n\'est pas ce portail';
  } catch (e) { reach = `injoignable (${e instanceof Error ? (e.cause instanceof Error ? e.cause.message : e.message) : String(e)})`; }
  out.push({ check: HOST_CHECK.appReach, ok: reach === 'mène bien à cette instance', detail: `${scheme}://${app} ${reach}` });
  return out;
}

/** Verifie le seul nom du portail (changement depuis Parametres). */
export async function checkAppHost(appHost: string, scheme: string): Promise<{ ok: boolean; host: string | null; checks: CheckResult[] }> {
  const app = normalizeHost(appHost);
  const checks: CheckResult[] = [{ check: HOST_CHECK.appFormat, ok: !!app, detail: app ?? 'nom d\'hôte invalide' }];
  if (app) checks.push(...(await appReachChecks(app, scheme)));
  return { ok: checks.every((c) => c.ok), host: app, checks };
}

/** Verifie les deux noms ; chaque point est rendu, pour un message precis en cas d'echec. */
export async function checkHosts(appHost: string, brokerHost: string, scheme: string): Promise<{ ok: boolean; checks: CheckResult[] }> {
  const checks: CheckResult[] = [];
  // le port du broker est BROKER_PUBLIC_PORT : un port saisi dans son nom est ignore
  const app = normalizeHost(appHost), broker = normalizeHost(brokerHost)?.replace(/:\d+$/, '') ?? null;
  checks.push({ check: HOST_CHECK.appFormat, ok: !!app, detail: app ?? 'nom d\'hôte invalide' });
  checks.push({ check: HOST_CHECK.brokerFormat, ok: !!broker, detail: broker ?? 'nom d\'hôte invalide' });
  if (app) checks.push(...(await appReachChecks(app, scheme)));
  if (broker) {
    const names = brokerCertNames();
    const inCert = names.includes(broker);
    checks.push({ check: HOST_CHECK.brokerCert, ok: inCert, detail: inCert ? 'présent dans le certificat du broker'
      : names.length ? `absent du certificat (qui contient : ${names.join(', ')})` : 'certificat du broker introuvable' });
    const ip = await resolves(broker.replace(/:\d+$/, ''));
    checks.push({ check: HOST_CHECK.brokerDns, ok: !!ip, detail: ip ? `résout vers ${ip}` : 'ne se résout pas (DNS)' });
    if (ip) {
      // preuve que le nom mene a NOTRE broker : le certificat presente doit etre le notre
      const remote = await remoteFingerprint(broker, BROKER_PUBLIC_PORT), local = brokerCertFingerprint();
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
