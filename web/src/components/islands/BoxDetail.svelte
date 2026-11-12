<script lang="ts">
  // Ecran d'un boitier : onglets Configuration (lecture seule) et Gerer (renommer, supprimer avec
  // confirmation dans la page).
  import { t, ROUTES, type Lang } from '../../lib/i18n.ts';
  import { postJson, ignoreBody } from '../../lib/api.ts';
  import type { Boitier } from '../../lib/types.ts';

  interface Props { boitier: Boitier; lang: Lang; }
  const { boitier: b, lang }: Props = $props();
  const s = $derived(t(lang));

  const TAB = { cfg: 'cfg', manage: 'manage' } as const;
  type Tab = (typeof TAB)[keyof typeof TAB];
  let tab = $state<Tab>(TAB.cfg);
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

<div class="subtabs" role="tablist">
  <button class={['subtab', { active: tab === TAB.cfg }]} type="button" data-sub={TAB.cfg} onclick={() => { tab = TAB.cfg; }}>{s.tabConfig}</button>
  <button class={['subtab', { active: tab === TAB.manage }]} type="button" data-sub={TAB.manage} onclick={() => { tab = TAB.manage; }}>{s.tabManage}</button>
</div>

<div class="subpanel" data-panel={TAB.cfg} hidden={tab !== TAB.cfg}>
  <div class="cfg-grid">
    <div class="panel">
      <h3>{s.availability} <span class="ro">{s.readonly}</span></h3>
      <div class="kv"><span class="k">{s.state}</span><span class="v">{b.online ? s.online : s.offlineShort}</span></div>
      {#if b.uptime}<div class="kv"><span class="k">{s.since}</span><span class="v">{b.uptime}</span></div>{/if}
      {#if b.wifi?.rssiDbm != null}<div class="kv"><span class="k">{s.wifiSignal}</span><span class="v">{b.wifi.rssiDbm} dBm</span></div>{/if}
      {#if b.radios}<div class="kv"><span class="k">{s.radios}</span><span class="v">{b.radios}</span></div>{/if}
      <div class="kv"><span class="k">{s.firmware}</span><span class="v" style={b.updateAvailable ? 'color:var(--warn)' : undefined}>{b.updateAvailable ? s.updateAvailable : s.upToDate}</span></div>
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
    <div class="field"><label for="bx-name">{s.boxNameHint}</label><input id="bx-name" name="name" type="text" required bind:value={name} /></div>
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
  <p class="formerr" hidden={error === null}>{error}</p>
</div>
