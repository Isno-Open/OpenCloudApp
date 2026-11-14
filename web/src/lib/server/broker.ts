// Mise en place du broker : certificat emis au NOM CHOISI a l'installation (public ou reseau local),
// configuration ecrite, puis installation ou redemarrage par le superviseur. Sert a l'installation
// (/setup) et au demarrage (reconciliation : le certificat suit toujours le nom de la config).
import { issueBrokerCert, brokerCertMatches } from '@opencloudapp/core/pki.js';
import { writeBrokerConfig } from '@opencloudapp/core/broker-config.js';
import { deviceFamilies } from '@opencloudapp/core/device-families.js';
import { getModule, installModule, restartModule, BROKER_MODULE, type SupervisorResult } from '#lib/server/supervisor.ts';

/** Nom interne du broker dans la pile (hote de l'adresse annoncee par le catalogue). */
export async function brokerInternal(): Promise<{ host: string; url: string } | { error: string }> {
  const r = await getModule(BROKER_MODULE);
  if (!r.ok) return { error: r.error };
  if (!r.module.endpoint) return { error: 'adresse interne du broker inconnue (catalogue)' };
  return { host: new URL(r.module.endpoint).hostname, url: r.module.endpoint };
}


/** Emet le certificat pour ce nom, ecrit la config (ACL deduite des familles installees : les plugins
 *  sont charges avant), et installe ou redemarre le broker. */
export async function prepareBroker(publicHost: string): Promise<SupervisorResult> {
  const internal = await brokerInternal();
  if ('error' in internal) return { ok: false, error: internal.error };
  const host = publicHost.replace(/:\d+$/, '');
  const changed = !brokerCertMatches(host);   // nom, CA et ca.crt du broker : tout doit correspondre
  if (changed) issueBrokerCert(host, internal.host);
  const aclChanged = writeBrokerConfig(deviceFamilies().map((f) => f.topicRoot));
  const st = await getModule(BROKER_MODULE);
  if (!st.ok) return st;
  // relire le nouveau certificat, ou la nouvelle ACL (famille installee ou retiree)
  if (st.module.ready) return changed || aclChanged ? restartModule(BROKER_MODULE) : st;
  return installModule(BROKER_MODULE);
}
