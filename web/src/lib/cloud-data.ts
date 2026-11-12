// Acces aux donnees, branche sur le backend isno-cloud partage (@core). Un Device du store = un
// BOITIER ; les volets/portails = les covers, issus de l'etat MQTT live (coversOf). On mappe vers les
// types UI. Les libelles de commande ne viennent PAS d'ici (localises par type, cf. i18n.actionLabels).
import { listDevices, countDevices, findDevice, getAccount } from '@core/store.js';
import { coversOf } from '@core/mqtt.js';
import { DEVICE_TYPE, type Appareil, type Boitier, type Account, type DeviceType } from './types.ts';
import { boot } from '../server/boot.ts';

const mapType = (t: string): DeviceType => (t === DEVICE_TYPE.portail ? DEVICE_TYPE.portail : DEVICE_TYPE.volet);

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
    via: accountId.includes('@') ? 'SSO isno.fr' : 'self-host',
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
  const devices = await listDevices(accountId);
  const out: Appareil[] = [];
  for (const d of devices) {
    const covers = coversOf(d.deviceId);
    const online = covers.length > 0;
    for (const c of covers) {
      out.push({
        id: `${d.deviceId}:${c.slug}`, boitierId: d.deviceId, slug: c.slug, name: c.slug,
        type: mapType(c.type), positional: c.positional, position: c.position, online,
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
