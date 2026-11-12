<script lang="ts">
  // Cadre d'une carte d'appareil, commun a tous : icone et nom en tete, contenu, pied (boitier, etat,
  // action), details facultatifs. Une carte de volet et une carte « inconnu » ne different que par ce
  // qu'elles mettent dedans.
  import type { Snippet } from 'svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  interface Props {
    lang: Lang; name: string; boxId: string; boxName: string; online: boolean; grouped: boolean; unknown?: boolean;
    icon: Snippet; badge?: Snippet; children: Snippet; action?: Snippet; details?: Snippet;
  }
  const { lang, name, boxId, boxName, online, grouped, unknown = false, icon, badge, children, action, details }: Props = $props();
  const s = $derived(t(lang));
</script>

<div class={['volet', { unknown, offline: !online }]} data-box={boxId}>
  <div class="top">
    <span class="ico">{@render icon()}</span>
    <span class="vname">{name}</span>
    {@render badge?.()}
  </div>
  {@render children()}
  <div class="foot">
    {#if grouped}
      <span class="box-tag">{#if !online}<span class="dot off"></span>{s.offlineShort}{/if}</span>
    {:else}
      <span class="box-tag"><span class={['dot', { off: !online }]}></span>{boxName}{#if !online}{s.offlineSuffix}{/if}</span>
    {/if}
    {@render action?.()}
  </div>
  {@render details?.()}
</div>
