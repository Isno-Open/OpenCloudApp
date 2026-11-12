// Acces aux donnees, branche sur le backend isno-cloud partage (@core). Un Device du store = un
// BOITIER ; les volets/portails = les covers, issus de l'etat MQTT live (coversOf). On mappe vers les
// types UI. Le type d'un appareil (nom, icone, commandes) est celui qu'un plugin declare.
import { listDevices, countDevices, findDevice, getAccount } from '@opencloudapp/core/store.js';
import { coversOf } from '@opencloudapp/core/mqtt.js';
import { deviceType } from '@opencloudapp/core/device-types.js';
import type { Appareil, Boitier, Account } from '#lib/types.ts';
import { boot } from '#lib/server/boot.ts';
import { plugins } from '#lib/server/auth.ts';

// Type publie par le boitier -> type declare par un plugin, ou null (inconnu). Jamais de repli sur
// « volet » : un type nouveau deguise en volet recevrait des commandes de volet.

// online : proxy MVP (le firmware ne publie pas encore de presence) = au moins un cover vu via le relais.
const boitierOf = (d: { deviceId: string; name: string; firmware: string }): Boitier => {
  const covers = coversOf(d.deviceId);
  return { id: d.deviceId, name: d.name, firmware: d.firmware, online: covers.length > 0, updateAvailable: false, count: covers.length };
};

export async function getAccountInfo(accountId: string): Promise<Account> {
  await boot();
  const a = await getAccount(accountId);
  return {
    email: accountId,
    name: a?.name ?? null,
    admin: !!a?.admin,
    totpEnabled: !!a?.totpEnabled,
    boitiers: await countDevices(accountId),
    cap: a?.deviceCap ?? 5,
  };
}

export async function listBoitiers(accountId: string): Promise<Boitier[]> {
  await boot();
  return (await listDevices(accountId)).map(boitierOf);
}

export async function listAppareils(accountId: string): Promise<Appareil[]> {
  await boot();
  await plugins();   // les types d'appareils viennent des plugins
  const devices = await listDevices(accountId);
  const out: Appareil[] = [];
  for (const d of devices) {
    const covers = coversOf(d.deviceId);
    const online = covers.length > 0;
    for (const c of covers) {
      out.push({
        id: `${d.deviceId}:${c.slug}`, boitierId: d.deviceId, slug: c.slug, name: c.slug,
        kind: deviceType(c.type), declaredType: c.type, positional: c.positional, position: c.position, online,
      });
    }
  }
  return out;
}

export async function getBoitier(id: string, accountId: string): Promise<Boitier | undefined> {
  await boot();
  const d = await findDevice(id, accountId);
  return d ? boitierOf(d) : undefined;
}
