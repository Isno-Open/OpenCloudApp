// Acces aux donnees, branche sur le backend isno-cloud partage (@core). Un Device du store = un
// BOITIER ; ses appareils (volets, portails...) sont ce que la FAMILLE du boitier lit de ses messages
// (device-families.ts). La famille d'un boitier est celle qu'il a declaree a l'enrolement (firmware).
import { listDevices, countDevices, findDevice, getAccount } from '@opencloudapp/core/store.js';
import { deviceOnline } from '@opencloudapp/core/mqtt.js';
import { familyById, boxState, compareDevices, type DeviceState } from '@opencloudapp/core/device-families.js';
import { KIND_PLACE } from '@opencloudapp/core/family-contract.js';
import { isNewerVersion } from '@opencloudapp/core/version.js';
import type { Appareil, Boitier, Account } from '#lib/types.ts';
import type { AdminBox } from '#lib/users-view.ts';
import { EVENT_LEVEL } from '@opencloudapp/core/family-contract.js';
import { boot } from '#lib/server/boot.ts';
import { plugins } from '#lib/server/auth.ts';

// online : ce que le boitier ANNONCE (fait de presence de sa famille), pas une deduction de ses
// appareils, dont les etats restent retenus.
/** Appareils pilotes depuis l'accueil (pas ceux que la famille range sur la page du boitier). */
const countHome = (firmware: string, devices: ReadonlyMap<string, DeviceState> | undefined): number => {
  const fam = familyById(firmware);
  return [...(devices?.values() ?? [])].filter((d) => fam?.kinds.find((k) => k.id === d.kind)?.place !== KIND_PLACE.box).length;
};

const boitierOf = (d: { deviceId: string; name: string; firmware: string; lastSeenAt?: number | null }): Boitier => {
  const st = boxState(d.firmware, d.deviceId);
  return {
    id: d.deviceId, familyKnown: !!familyById(d.firmware), reorderable: !!familyById(d.firmware)?.reorder, name: d.name, firmware: st?.firmware ?? d.firmware,
    online: deviceOnline(d.firmware, d.deviceId), cloudDisabled: st?.disabled === true, updateAvailable: !!st?.latest && !!st.firmware && isNewerVersion(st.latest, st.firmware),
    count: countHome(d.firmware, st?.devices), lastSeenAt: d.lastSeenAt ?? null,
    ...(st ? {
      wifi: { ssid: st.network.ssid ?? null, ip: st.network.ip ?? null, rssiDbm: st.health.rssiDbm ?? null },
      broker: st.network.broker ?? null,
      uptimeS: st.health.uptimeS ?? null,
      memory: st.health.freeHeap !== undefined && st.health.minFreeHeap !== undefined ? { free: st.health.freeHeap, min: st.health.minFreeHeap } : null,
      lastReset: st.health.lastReset ?? null,
      trial: st.trial, previous: st.previous,
      actions: (familyById(d.firmware)?.boxControls ?? []).filter((c) => st.actions.get(c.id) === true),
      files: (familyById(d.firmware)?.boxFiles ?? []).map(({ id, label }) => ({ id, label })),
    } : {}),
  };
};

/** Alertes gardees par boitier dans la vue operateur. */
const ADMIN_ALERTS = 3;
/** Les boitiers d'un compte, vus par l'operateur (lecture seule). */
export async function adminBoxes(accountId: string): Promise<AdminBox[]> {
  return (await listDevices(accountId)).map((d): AdminBox => {
    const st = boxState(d.firmware, d.deviceId), fam = familyById(d.firmware);
    return {
      id: d.deviceId, name: d.name, family: fam ? fam.label : null,
      firmware: st?.firmware ?? d.firmware, latest: st?.latest ?? null,
      updateAvailable: !!st?.latest && !!st.firmware && isNewerVersion(st.latest, st.firmware), trial: st?.trial === true,
      online: deviceOnline(d.firmware, d.deviceId), cloudDisabled: st?.disabled === true,
      lastSeenAt: d.lastSeenAt ?? null, pairedAt: d.pairedAt ?? null,
      devices: st?.devices.size ?? 0, rssiDbm: st?.health.rssiDbm ?? null, minFreeHeap: st?.health.minFreeHeap ?? null,
      uptimeS: st?.health.uptimeS ?? null, lastReset: st?.health.lastReset ?? null,
      alerts: (st?.events ?? []).filter((e) => e.level === EVENT_LEVEL.alert).slice(0, ADMIN_ALERTS).map((e) => ({ at: e.at, text: e.text })),
    };
  });
}

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
  await plugins();   // les familles de boitiers viennent des plugins
  const devices = await listDevices(accountId);
  const out: Appareil[] = [];
  for (const d of devices) {
    const fam = familyById(d.firmware);
    const st = boxState(d.firmware, d.deviceId);
    if (!fam || !st) continue;
    const online = deviceOnline(d.firmware, d.deviceId);
    // classes par rang d'affichage, ceux sans rang a la suite dans l'ordre des types de la famille
    const ordered = [...st.devices].sort(([, a], [, b]) => compareDevices(fam, a, b));
    for (const [slug, dev] of ordered) {
      out.push({
        id: `${d.deviceId}:${slug}`, boitierId: d.deviceId, slug, name: dev.name,
        kind: dev.known ? fam.kinds.find((k) => k.id === dev.kind) ?? null : null, declaredType: dev.kind,
        values: Object.fromEntries(dev.values), hidden: [...dev.hidden], settings: Object.fromEntries(dev.settings), online,
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
