<script lang="ts">
  // Carte d'un appareil, au visuel du firmware OpenProfalux : icone, nom, trois commandes, volet dessine
  // pour les positionnels, roue crantee pour les details. Icone, nom et libelles viennent du TYPE,
  // declare par un plugin (kind) ; le relais recoit l'action canonique (DEVICE_ACTION). Meme cadre pour
  // tous les types : seul le contenu varie.
  import { DEVICE_ACTION, type DeviceAction } from '@core/plugin-contract.js';
  import { t, type Lang } from '../lib/i18n.ts';
  import { postJson, ignoreBody } from '../lib/api.ts';
  import type { KnownAppareil } from '../lib/types.ts';

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
  let details = $state(false);
  let sending = $state<DeviceAction | null>(null);

  async function send(action: DeviceAction): Promise<void> {
    sending = action;
    await postJson('/api/cmd', { device_id: a.boitierId, slug: a.slug, action }, s.netErr, ignoreBody);
    setTimeout(() => { sending = null; }, SENDING_MS);
  }
</script>

<div class={['volet', { offline: !a.online }]} data-box={a.boitierId}>
  <div class="top">
    <span class="ico">
      {#if 'path' in a.kind.icon}
        <svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px" aria-label={a.kind.label[lang]}><path d={a.kind.icon.path}></path></svg>
      {:else}
        <span aria-label={a.kind.label[lang]}>{a.kind.icon.glyph}</span>
      {/if}
    </span>
    <span class="vname">{a.name}</span>
    {#if showPos}<span class="pct">{a.position} %</span>{/if}
  </div>

  <div class="dpad" data-device={a.boitierId} data-slug={a.slug}>
    {#each buttons as b (b.action)}
      <button type="button" class={{ sending: sending === b.action }} data-action={b.action} title={b.label} aria-label={b.label} disabled={!a.online} onclick={() => send(b.action)}>{b.glyph}</button>
    {/each}
  </div>

  {#if a.positional}
    <div class="slat" style={`--p:${a.position ?? 0}${a.online ? '' : ';opacity:.5'}`} title={showPos ? `${a.position} %` : undefined}></div>
  {/if}

  <div class="foot">
    {#if grouped}
      <span class="box-tag">{#if !a.online}<span class="dot off"></span>{s.offlineShort}{/if}</span>
    {:else}
      <span class="box-tag"><span class={['dot', { off: !a.online }]}></span>{boitierName}{#if !a.online}{s.offlineSuffix}{/if}</span>
    {/if}
    <button class="gear" type="button" data-det title={s.details} aria-label={s.details} onclick={() => { details = !details; }}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    </button>
  </div>

  <div class="hw-det" hidden={!details}>
    <div class="mini-field"><input type="text" value={a.name} aria-label={s.nameLabel} /><button class="btn sm primary" type="button">{s.rename}</button></div>
    <div class="kv"><span class="k">{s.typeWord}</span><span class="v">{a.kind.label[lang]} · {a.positional ? s.positional : s.impulsional}</span></div>
    {#if showPos}<div class="kv"><span class="k">{s.posWord}</span><span class="v">{a.position} %</span></div>{/if}
    {#if a.rssiDbm != null}<div class="kv"><span class="k">{s.wifiSignal}</span><span class="v">{s.radioState(a.rssiDbm)}</span></div>{/if}
    {#if !a.online}<div class="kv"><span class="k">{s.state}</span><span class="v">{s.offline}</span></div>{/if}
  </div>
</div>
