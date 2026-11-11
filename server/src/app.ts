// IHM SSR minimale (app.isno.fr) : login + liste des volets avec UP/STOP/DOWN.
export const esc = (s: string): string => s.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] ?? c));
const STYLE = `<style>:root{color-scheme:dark light}body{font-family:system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:1rem}
h1{font-size:1.4rem}input,button{font-size:1rem;padding:.5rem;margin:.2rem 0}form{display:flex;flex-direction:column;gap:.3rem;max-width:16rem}
.dev{display:flex;justify-content:space-between;align-items:center;border:1px solid #8884;border-radius:.5rem;padding:.6rem;margin:.4rem 0}
.btns button{width:3rem;margin-left:.3rem}.fw{opacity:.5;font-size:.8rem}.acc{opacity:.7;font-size:.9rem}</style>`;
export const loginPage = (): string =>
  `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ISNO Cloud</title>${STYLE}</head><body><main><h1>ISNO Cloud</h1><form method="post" action="/login"><input name="user" placeholder="Compte" autofocus><input name="pass" type="password" placeholder="Mot de passe"><button>Entrer</button></form></main></body></html>`;
export function devicesPage(account: string, devices: { deviceId: string; name: string; firmware: string }[]): string {
  const rows = devices.length
    ? devices.map((d) => `<div class="dev"><div>${esc(d.name)} <span class="fw">${esc(d.firmware)}</span></div><div class="btns" data-id="${esc(d.deviceId)}"><button data-a="UP">▲</button><button data-a="STOP">■</button><button data-a="DOWN">▼</button></div></div>`).join("")
    : `<p>Aucun appareil enrôlé.</p>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Mes volets</title>${STYLE}</head><body><main><h1>Mes volets</h1><p class="acc">${esc(account)} · <a href="#" onclick="fetch('/logout',{method:'POST'}).then(()=>location.reload());return false">déconnexion</a></p>${rows}</main><script>document.querySelectorAll('.btns button').forEach(function(b){b.onclick=function(){fetch('/api/cmd',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({device_id:b.parentElement.dataset.id,action:b.dataset.a})});};});</script></body></html>`;
}
