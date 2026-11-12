<script lang="ts">
  // Carte d'un appareil d'un type declare (kind) : trois commandes, volet dessine pour les positionnels,
  // roue crantee pour les details. Icone, nom et libelles viennent du TYPE ; le relais recoit l'action
  // canonique (DEVICE_ACTION).
  import { DEVICE_ACTION, type DeviceAction } from '@opencloudapp/core/plugin-contract.js';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { KnownAppareil } from '#lib/types.ts';
  import DeviceFrame from './DeviceFrame.svelte';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import GearIcon from '#lib/components/ui/GearIcon.svelte';

  interface Props { appareil: KnownAppareil; boitierName: string; lang: Lang; grouped?: boolean; }
  const { appareil: a, boitierName, lang, grouped = false }: Props = $props();
  const s = $derived(t(lang));
  const showPos = $derived(a.positional && a.position !== null);
  const SENDING_MS = 400;   // retour visuel du bouton presse

  const buttons = $derived([
    { action: DEVICE_ACTION.up, glyph: '▲', label: a.kind.actions.up[lang] },
    { action: DEVICE_ACTION.stop, glyph: '■', label: a.kind.actions.stop[lang] },
    { action: DEVICE_ACTION.down, glyph: '▼', label: a.kind.actions.down[lang] },
  ]);
  let showDetails = $state(false);
  let sending = $state<DeviceAction | null>(null);

  async function send(action: DeviceAction): Promise<void> {
    sending = action;
    await postJson('/api/cmd', { device_id: a.boitierId, slug: a.slug, action }, s.netErr, ignoreBody);
    setTimeout(() => { sending = null; }, SENDING_MS);
  }
</script>

<DeviceFrame {lang} name={a.name} boxId={a.boitierId} boxName={boitierName} online={a.online} {grouped}>
  {#snippet icon()}
    {#if 'path' in a.kind.icon}
      <svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px" aria-label={a.kind.label[lang]}><path d={a.kind.icon.path}></path></svg>
    {:else}
      <span aria-label={a.kind.label[lang]}>{a.kind.icon.glyph}</span>
    {/if}
  {/snippet}
  {#snippet badge()}{#if showPos}<span class="pct">{a.position} %</span>{/if}{/snippet}
  <div class="dpad" data-device={a.boitierId} data-slug={a.slug}>
    {#each buttons as b (b.action)}
      <button type="button" class={{ sending: sending === b.action }} data-action={b.action} title={b.label} aria-label={b.label} disabled={!a.online} onclick={() => send(b.action)}>{b.glyph}</button>
    {/each}
  </div>
  {#if a.positional}
    <div class="slat" style={`--p:${a.position ?? 0}${a.online ? '' : ';opacity:.5'}`} title={showPos ? `${a.position} %` : undefined}></div>
  {/if}
  {#snippet action()}
    <button class="gear" type="button" data-det title={s.details} aria-label={s.details} onclick={() => { showDetails = !showDetails; }}><GearIcon /></button>
  {/snippet}
  {#snippet details()}
    <div class="hw-det" hidden={!showDetails}>
      <div class="mini-field"><input type="text" value={a.name} aria-label={s.nameLabel} /><button class="btn sm primary" type="button">{s.rename}</button></div>
      <KeyValue label={s.typeWord} value={`${a.kind.label[lang]} · ${a.positional ? s.positional : s.impulsional}`} />
      {#if showPos}<KeyValue label={s.posWord} value={`${a.position} %`} />{/if}
      {#if a.rssiDbm != null}<KeyValue label={s.wifiSignal} value={s.radioState(a.rssiDbm)} />{/if}
      {#if !a.online}<KeyValue label={s.state} value={s.offline} />{/if}
    </div>
  {/snippet}
</DeviceFrame>
