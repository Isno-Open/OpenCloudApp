<script lang="ts">
  // Ecran d'un boitier : onglets Configuration (lecture seule) et Gerer (renommer, supprimer avec
  // confirmation dans la page).
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import SubTabs from '#lib/components/ui/SubTabs.svelte';
  import { t, ROUTES, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { Appareil, Boitier } from '#lib/types.ts';
  import { isKnownAppareil } from '#lib/types.ts';
  import { KIND_PLACE } from '@opencloudapp/core/family-contract.js';
  import DeviceCard from '#lib/components/devices/DeviceCard.svelte';
  import { relativeTime } from '#lib/time.ts';

  interface Props { boitier: Boitier; appareils: readonly Appareil[]; lang: Lang; now: number; }
  const { boitier: b, appareils, lang, now }: Props = $props();
  const s = $derived(t(lang));
  // action du boitier entier (mise a jour, retour a la version precedente) : confirmation dans la page
  // (pas de confirm() du navigateur), puis commande au relais, que la famille traduit
  let asking = $state<string | null>(null);
  let actionMsg = $state('');
  async function runAction(id: string): Promise<void> {
    asking = null;
    const r = await postJson('/api/cmd', { device_id: b.id, control: id }, s.actionError, ignoreBody);
    actionMsg = r.ok ? s.actionSent : s.actionError;
  }

  // fichier du boitier (sa sauvegarde) : demande au boitier par le portail, qui le remet sans le garder ;
  // l'erreur s'affiche dans la page (le lien direct telechargerait le message d'erreur comme fichier)
  let fileBusy = $state<string | null>(null);
  let fileMsg = $state('');
  async function download(id: string): Promise<void> {
    fileBusy = id; fileMsg = s.fileWaiting;
    try {
      const r = await fetch(`/api/boitier/file?device_id=${encodeURIComponent(b.id)}&file=${encodeURIComponent(id)}`);
      if (!r.ok) {
        const body: unknown = await r.json().catch(() => null);
        const why = body && typeof body === 'object' && 'error' in body && typeof body.error === 'string' ? body.error : '';
        fileMsg = why ? `${s.fileError} (${why})` : s.fileError;
        return;
      }
      const name = /filename="([^"]+)"/.exec(r.headers.get('content-disposition') ?? '')?.[1] ?? `${id}.json`;
      const href = URL.createObjectURL(await r.blob());
      const a = document.createElement('a');
      a.href = href; a.download = name; a.click();
      URL.revokeObjectURL(href);
      fileMsg = s.fileDone;
    } catch { fileMsg = s.fileError; }
    finally { fileBusy = null; }
  }

  const TAB = { cfg: 'cfg', manage: 'manage' } as const;
  let tab = $state<string>(TAB.cfg);
  // appareils que la famille range sur la page du boitier : un onglet par groupe (ex. Telecommandes),
  // dans l'ordre ou ils apparaissent
  const groups = $derived.by(() => {
    const out: { id: string; label: string; hint: string | null; items: Appareil[] }[] = [];
    for (const a of appareils) {
      if (a.kind?.place !== KIND_PLACE.box || !a.kind.group) continue;
      const label = a.kind.group[lang];
      let g = out.find((x) => x.label === label);
      // ancre de l'onglet : le type de sa premiere carte (lisible dans l'adresse, stable)
      if (!g) { g = { id: a.kind.id, label, hint: a.kind.hint ? a.kind.hint[lang] : null, items: [] }; out.push(g); }
      g.items.push(a);
    }
    return out;
  });
  const initialName = (): string => b.name;
  let name = $state(initialName());
  let confirming = $state(false);
  let error = $state<string | null>(null);

  async function rename(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    error = null;
    const r = await postJson('/api/boitier/rename', { device_id: b.id, name: n }, s.renameError, ignoreBody);
    if (r.ok) location.reload(); else error = r.error;
  }
  async function remove(): Promise<void> {
    error = null;
    const r = await postJson('/api/boitier/delete', { device_id: b.id }, s.deleteError, ignoreBody);
    if (r.ok) location.href = ROUTES.appareils[lang]; else error = r.error;
  }
</script>

<SubTabs label={s.tabConfig} bind:current={tab} items={[{ id: TAB.cfg, label: s.tabConfig }, ...groups.map((g) => ({ id: g.id, label: g.label })), { id: TAB.manage, label: s.tabManage }]} />

{#each groups as g (g.id)}
  <div class="subpanel" data-panel={g.id} hidden={tab !== g.id}>
    {#if g.hint}<p class="note group-hint" data-group-hint={g.id}>{g.hint}</p>{/if}
    <div class="hw-grid">
      {#each g.items as a (a.id)}
        {#if isKnownAppareil(a)}<DeviceCard appareil={a} siblings={appareils} boitierName={b.name} {lang} grouped />{/if}
      {/each}
    </div>
  </div>
{/each}

<div class="subpanel" data-panel={TAB.cfg} hidden={tab !== TAB.cfg}>
  <div class="cfg-grid">
    <div class="panel">
      <h3>{s.availability} <span class="ro">{s.readonly}</span></h3>
      <KeyValue label={s.state} value={s.presence(b.online, b.cloudDisabled)} />
      <KeyValue label={s.cloudMode} value={s.cloudModeValue(b.online, b.cloudDisabled)} />
      {#if !b.online && b.lastSeenAt !== null}<KeyValue label={s.lastSeenLabel} value={relativeTime(b.lastSeenAt, now, lang)} />{/if}
      {#if b.uptimeS != null}<KeyValue label={s.since} value={s.uptimeValue(b.uptimeS)} />{:else if b.uptime}<KeyValue label={s.since} value={b.uptime} />{/if}
      {#if b.lastReset}<KeyValue label={s.lastReset} value={b.lastReset[lang]} />{/if}
      {#if b.wifi?.rssiDbm != null}<KeyValue label={s.wifiSignal} value={`${b.wifi.rssiDbm} dBm`} />{/if}
      {#if b.wifi?.ssid}<KeyValue label={s.wifiNetwork} value={b.wifi.ssid} />{/if}
      {#if b.wifi?.ip}<KeyValue label={s.ipAddress} value={b.wifi.ip} />{/if}
      {#if b.broker}<KeyValue label={s.localBroker} value={b.broker} />{/if}
      {#if b.memory}<KeyValue label={s.memory} value={s.memoryValue(b.memory.free, b.memory.min)} />{/if}
      {#if b.radios}<KeyValue label={s.radios} value={b.radios} />{/if}
      <KeyValue label={s.firmware}><span style={b.updateAvailable ? 'color:var(--warn)' : undefined}>{b.updateAvailable ? s.updateAvailable : s.upToDate}</span></KeyValue>
      {#if b.trial}<KeyValue label={s.state} value={s.onTrial} />{/if}
      {#if b.previous}<KeyValue label={s.previousVersion} value={b.previous} />{/if}
      {#each b.actions ?? [] as act (act.id)}
        <div class="box-action" data-box-action={act.id}>
          {#if asking === act.id}
            {#if act.confirm}<p class="note">{act.confirm[lang]}</p>{/if}
            <button type="button" class="btn" data-confirm={act.id} onclick={() => runAction(act.id)}>{s.confirmAction}</button>
            <button type="button" class="btn ghost" onclick={() => { asking = null; }}>{s.cancel}</button>
          {:else}
            <button type="button" class="btn" data-ask={act.id} disabled={!b.online} onclick={() => { asking = act.confirm ? act.id : null; if (!act.confirm) runAction(act.id); }}>{act.label[lang]}</button>
          {/if}
        </div>
      {/each}
      {#if actionMsg}<p class="note" role="status">{actionMsg}</p>{/if}
    </div>
    {#if b.files?.length}
      <div class="panel" data-box-files>
        <h3>{s.boxFiles}</h3>
        <p class="note">{s.boxFilesNote}</p>
        {#each b.files as f (f.id)}
          <button type="button" class="btn" data-file={f.id} disabled={!b.online || fileBusy !== null} onclick={() => download(f.id)}>{f.label[lang]}</button>
        {/each}
        {#if fileMsg}<p class="note" role="status" data-file-msg>{fileMsg}</p>{/if}
      </div>
    {/if}
  </div>
</div>

<div class="subpanel" data-panel={TAB.manage} hidden={tab !== TAB.manage}>
  <form class="panel" id="renameForm" data-boitier={b.id} style="margin-bottom:.8rem" onsubmit={rename}>
    <h3>{s.boxName}</h3>
    <Field label={s.boxNameHint} forId="bx-name"><input id="bx-name" name="name" type="text" required bind:value={name} /></Field>
    <button class="btn primary" type="submit">{s.rename}</button>
  </form>
  <div class="danger-zone">
    <h3>{s.deleteTitle}</h3>
    <p class="note">{s.deleteNote}</p>
    {#if !confirming}
      <button class="btn danger" type="button" id="delBtn" style="margin-top:.5rem" onclick={() => { confirming = true; }}>{s.deleteBtn}</button>
    {:else}
      <div id="delConfirm" style="margin-top:.6rem;display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <span class="note" style="margin:0">{s.confirmDelete(b.name)}</span>
        <button class="btn danger sm" type="button" id="delYes" onclick={remove}>{s.yesDelete}</button>
        <button class="btn ghost sm" type="button" id="delCancel" onclick={() => { confirming = false; }}>{s.cancel}</button>
      </div>
    {/if}
  </div>
  <ErrorText error={error} />
</div>

<style>
  .group-hint { margin: 0 0 .8rem; max-width: 65ch; }
</style>
