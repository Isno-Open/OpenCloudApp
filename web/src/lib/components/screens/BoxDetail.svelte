<script lang="ts">
  // Ecran d'un boitier : onglets Configuration (lecture seule) et Gerer (renommer, supprimer avec
  // confirmation dans la page).
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import SubTabs from '#lib/components/ui/SubTabs.svelte';
  import { t, ROUTES, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { Boitier } from '#lib/types.ts';
  import { relativeTime } from '#lib/time.ts';

  interface Props { boitier: Boitier; lang: Lang; now: number; }
  const { boitier: b, lang, now }: Props = $props();
  const s = $derived(t(lang));

  const TAB = { cfg: 'cfg', manage: 'manage' } as const;
  let tab = $state<string>(TAB.cfg);
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

<SubTabs label={s.tabConfig} bind:current={tab} items={[{ id: TAB.cfg, label: s.tabConfig }, { id: TAB.manage, label: s.tabManage }]} />

<div class="subpanel" data-panel={TAB.cfg} hidden={tab !== TAB.cfg}>
  <div class="cfg-grid">
    <div class="panel">
      <h3>{s.availability} <span class="ro">{s.readonly}</span></h3>
      <KeyValue label={s.state} value={b.online ? s.online : s.offlineShort} />
      {#if !b.online && b.lastSeenAt !== null}<KeyValue label={s.lastSeenLabel} value={relativeTime(b.lastSeenAt, now, lang)} />{/if}
      {#if b.uptime}<KeyValue label={s.since} value={b.uptime} />{/if}
      {#if b.wifi?.rssiDbm != null}<KeyValue label={s.wifiSignal} value={`${b.wifi.rssiDbm} dBm`} />{/if}
      {#if b.radios}<KeyValue label={s.radios} value={b.radios} />{/if}
      <KeyValue label={s.firmware}><span style={b.updateAvailable ? 'color:var(--warn)' : undefined}>{b.updateAvailable ? s.updateAvailable : s.upToDate}</span></KeyValue>
    </div>
    <div class="panel">
      <h3>{s.comingSoon} <span class="ro">{s.readonly}</span></h3>
      <p class="note">{s.comingSoonNote}</p>
    </div>
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
