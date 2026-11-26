<script lang="ts">
  // Les appareils d'un boitier, pour les REGLER : une ligne par appareil (icone du type, nom, type) et le
  // bouton qui deplie son edition sous la ligne. Meme forme que « Mes appareils » sur le boitier. Un
  // appareil dont aucun plugin ne declare le type n'a rien a regler : il n'est pas liste.
  import { t, type Lang } from '#lib/i18n.ts';
  import type { Appareil } from '#lib/types.ts';
  import { isKnownAppareil } from '#lib/types.ts';
  import IconMark from '#lib/components/ui/IconMark.svelte';
  import DeviceEdit from './DeviceEdit.svelte';

  interface Props { appareils: readonly Appareil[]; lang: Lang; }
  const { appareils, lang }: Props = $props();
  const s = $derived(t(lang));
  const known = $derived(appareils.filter(isKnownAppareil));
  let open = $state<string | null>(null);
</script>

<div class="dev-list">
  {#each known as a (a.id)}
    <div class="dev-block">
      <div class={['dev-row', { open: open === a.id }]} data-row={a.slug}>
        <span class="dev-ico"><IconMark icon={a.kind.icon} label={a.kind.label[lang]} /></span>
        <div class="dev-text">
          <span class="dev-name"><b>{a.name}</b><span class="pill">{a.kind.label[lang]}</span></span>
          {#if !a.online}<span class="dev-detail">{s.offline}</span>{/if}
        </div>
        <button type="button" class={['btn', 'sm', { primary: open === a.id }]} aria-expanded={open === a.id} data-edit-toggle
          onclick={() => { open = open === a.id ? null : a.id; }}>{open === a.id ? s.editClose : s.editOpen}</button>
      </div>
      {#if open === a.id}<DeviceEdit appareil={a} siblings={appareils} {lang} />{/if}
    </div>
  {:else}
    <p class="note">{s.noDeviceToSet}</p>
  {/each}
</div>

<style>
  .dev-list { display: grid; gap: 9px; }
  .dev-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; padding: 11px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); }
  .dev-row.open { border-color: var(--accent-line); border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
  .dev-ico { font-size: 1.5rem; line-height: 1; display: inline-flex; color: var(--text-soft); }
  .dev-text { display: grid; gap: 2px; min-width: 0; }
  .dev-name { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .dev-detail { font-size: .8rem; color: var(--text-muted); }
</style>
