<script lang="ts">
  // Panneau : le cadre commun des ecrans (titre, mention lecture seule). Seul le contenu varie. En
  // formulaire (onsubmit), le panneau EST le formulaire, pour garder un seul cadre.
  import type { Snippet } from 'svelte';
  interface Props {
    title?: string; readonlyLabel?: string; id?: string; spaced?: boolean;
    onsubmit?: (e: SubmitEvent) => void; children: Snippet;
  }
  const { title, readonlyLabel, id, spaced = false, onsubmit, children }: Props = $props();
</script>

{#snippet body()}
  {#if title}<h3>{title}{#if readonlyLabel} <span class="ro">{readonlyLabel}</span>{/if}</h3>{/if}
  {@render children()}
{/snippet}

{#if onsubmit}
  <form class={['panel', { spaced }]} {id} {onsubmit}>{@render body()}</form>
{:else}
  <div class={['panel', { spaced }]} {id}>{@render body()}</div>
{/if}
