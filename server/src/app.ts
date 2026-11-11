// IHM SSR minimale (app.isno.fr) : login + appareils, chacun avec ses covers rendus PAR TYPE.
// Les libellés (Montée/Stop/Descente vs Ouvrir/Stop/Fermer), le type et "positionnel" viennent de ce
// que le DEVICE déclare (profiles.json côté firmware). Le cloud ne recode pas les types.
import type { Cover } from "./mqtt.js";
export type DeviceView = { deviceId: string; name: string; firmware: string; covers: Cover[] };

export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
const STYLE = `<style>:root{color-scheme:dark light}body{font-family:system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:1rem}
h1{font-size:1.4rem}h2{font-size:1.05rem;margin:1.2rem 0 .3rem}input,button{font-size:1rem;padding:.5rem;margin:.2rem 0}
form{display:flex;flex-direction:column;gap:.3rem;max-width:16rem}
.dev{display:flex;justify-content:space-between;align-items:center;border:1px solid #8884;border-radius:.5rem;padding:.6rem;margin:.4rem 0}
.btns button{min-width:3rem;margin-left:.3rem}.fw{opacity:.5;font-size:.8rem}.acc{opacity:.7;font-size:.9rem}.pos{opacity:.8;font-size:.85rem;margin-left:.4rem}</style>`;
const HEAD = (title: string): string =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>${STYLE}</head><body><main>`;

export const loginPage = (): string =>
  `${HEAD("ISNO Cloud")}<h1>ISNO Cloud</h1><form method="post" action="/login"><input name="user" placeholder="Compte" autofocus><input name="pass" type="password" placeholder="Mot de passe"><button>Entrer</button></form></main></body></html>`;

function coverRow(deviceId: string, c: Cover): string {
  const type = c.type ? `<span class="fw">${esc(c.type)}</span>` : "";
  const pos = c.positional && c.position !== null ? `<span class="pos">${esc(String(c.position))} %</span>` : "";
  return `<div class="dev"><div>${esc(c.slug)} ${type}${pos}</div>`
    + `<div class="btns" data-id="${esc(deviceId)}" data-slug="${esc(c.slug)}">`
    + `<button data-a="UP">${esc(c.up)}</button><button data-a="STOP">${esc(c.stop)}</button><button data-a="DOWN">${esc(c.down)}</button>`
    + `</div></div>`;
}
export function devicesPage(account: string, devices: DeviceView[]): string {
  const body = devices.length
    ? devices.map((d) => {
        const rows = d.covers.length
          ? d.covers.map((c) => coverRow(d.deviceId, c)).join("")
          : `<p class="acc">En attente de l'état de l'appareil…</p>`;
        return `<section><h2>${esc(d.name)} <span class="fw">${esc(d.firmware)}</span></h2>${rows}</section>`;
      }).join("")
    : `<p>Aucun appareil enrôlé.</p>`;
  return `${HEAD("Mes appareils")}<h1>Mes appareils</h1>`
    + `<p class="acc">${esc(account)} · <a href="#" onclick="fetch('/logout',{method:'POST'}).then(()=>location.reload());return false">déconnexion</a></p>`
    + `<div class="dev"><div>Ajouter un appareil</div><div class="btns"><button id="addDev">+ Obtenir un code</button></div></div><p class="acc" id="pairCode"></p>`
    + body
    + `<script>var ad=document.getElementById('addDev');if(ad)ad.onclick=function(){fetch('/api/device/new',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(function(r){return r.json();}).then(function(d){document.getElementById('pairCode').textContent=d.code?("Code d'appairage : "+d.code+" (a saisir dans le boitier)"):("Erreur : "+(d.error||d.offer||""));});};document.querySelectorAll('.btns button').forEach(function(b){b.onclick=function(){var p=b.parentElement;fetch('/api/cmd',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({device_id:p.dataset.id,slug:p.dataset.slug,action:b.dataset.a})});};});</script></main></body></html>`;
}
