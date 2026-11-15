// Acces aux donnees, branche sur le backend isno-cloud partage (@core). Un Device du store = un
// BOITIER ; ses appareils (volets, portails...) sont ce que la FAMILLE du boitier lit de ses messages
// (device-families.ts). La famille d'un boitier est celle qu'il a declaree a l'enrolement (firmware).
import { listDevices, countDevices, findDevice, getAccount } from '@opencloudapp/core/store.js';
import { deviceOnline } from '@opencloudapp/core/mqtt.js';
import { familyById, boxState, compareDevices, type DeviceState } from '@opencloudapp/core/device-families.js';
import { KIND_PLACE } from '@opencloudapp/core/family-contract.js';
import { isNewerVersion } from '@opencloudapp/core/version.js';
import type { Appareil, Boitier, Account } from '#lib/types.ts';
import type { AdminBox, AdminBoxDetail } from '#lib/users-view.ts';
import { CONTROL } from '@opencloudapp/core/family-contract.js';
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
      id: d.deviceId, name: d.name, family: fam ? fam.label : null, board: st?.board ?? null,
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

/** Fiches detaillees des boitiers d'un compte (page operateur d'un compte). */
export async function adminBoxDetails(accountId: string): Promise<AdminBoxDetail[]> {
  return Promise.all((await adminBoxes(accountId)).map(async (b): Promise<AdminBoxDetail> => {
    const d = (await listDevices(accountId)).find((x) => x.deviceId === b.id)!;
    const st = boxState(d.firmware, d.deviceId), fam = familyById(d.firmware);
    // un appareil range sur la page du boitier (une telecommande) : son type seulement, ni nom ni
    // reglage. Sans nom, sa famille peut lui donner son numero de serie, que le coeur ne sait pas
    // reconnaitre ; et son nom n'apporte rien au support (minimisation). Le nom d'un volet, lui, est
    // celui que l'utilisateur a donne a ce qu'il pilote.
    const appliances = st ? [...st.devices.values()].sort((x, y) => (fam ? compareDevices(fam, x, y) : x.name.localeCompare(y.name))).map((a) => {
      const kind = fam?.kinds.find((k) => k.id === a.kind);
      const pos = kind?.controls.find((c) => c.kind === CONTROL.position);
      const v = pos ? a.values.get(pos.id) : undefined;
      const onBox = kind?.place === KIND_PLACE.box;
      return {
        name: onBox ? '' : a.name, kind: kind ? kind.label : null, position: typeof v === 'number' ? v : null,
        settings: onBox ? [] : (kind?.settings ?? []).filter((f) => { const v0 = a.settings.get(f.key); return v0 !== undefined && v0 !== ''; }).map((f) => {
          const sv = a.settings.get(f.key);
          return { label: f.label, value: Array.isArray(sv) ? String(sv.length) : String(sv) };
        }),
      };
    }) : [];
    return { ...b, previous: st?.previous ?? null, freeHeap: st?.health.freeHeap ?? null, localBroker: !!st?.network.broker,
      appliances, events: (st?.events ?? []).map((e) => ({ at: e.at, alert: e.level === EVENT_LEVEL.alert, text: e.text })) };
  }));
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
