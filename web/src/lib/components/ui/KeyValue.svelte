<script lang="ts">
  // Ligne « libelle : valeur » des panneaux de lecture.
  import type { Snippet } from 'svelte';
  interface Props { label: string; value?: string | number; mono?: boolean; children?: Snippet; }
  const { label, value, mono = false, children }: Props = $props();
</script>

<div class="kv"><span class="k">{label}</span><span class={['v', { mono }]}>{#if children}{@render children()}{:else}{value}{/if}</span></div>
