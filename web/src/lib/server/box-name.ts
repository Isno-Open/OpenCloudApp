// Nom de boitier : unicite dans le compte, et transmission au boitier (retenu) par sa famille.
import { listDevices } from '@opencloudapp/core/store.js';
import { publishCommand } from '@opencloudapp/core/mqtt.js';
import { familyById, buildBoxName } from '@opencloudapp/core/device-families.js';
import { boxNameKey } from '#lib/box-name.ts';
import { plugins } from '#lib/server/auth.ts';

/** Un AUTRE boitier du compte porte-t-il deja ce nom ? */
export async function boxNameTaken(accountId: string, name: string, exceptDeviceId?: string): Promise<boolean> {
  const key = boxNameKey(name);
  return (await listDevices(accountId)).some((d) => d.deviceId !== exceptDeviceId && boxNameKey(d.name) === key);
}

/** Transmet son nom au boitier, si sa famille sait le dire. Un echec est journalise, jamais bloquant :
 *  le nom reste celui du portail, le boitier l'aura au prochain renommage. */
export async function sendBoxName(firmware: string, deviceId: string, name: string): Promise<void> {
  await plugins();
  const fam = familyById(firmware);
  const msg = fam ? buildBoxName(fam, deviceId, name) : null;
  if (!msg) return;
  if ('error' in msg) { console.error(`[boitier] ${deviceId} : nom non transmis (${msg.error})`); return; }
  try { publishCommand(msg.topic, msg.payload, msg.retain); }
  catch (e) { console.error(`[boitier] ${deviceId} : nom non transmis :`, e instanceof Error ? e.message : e); }
}
