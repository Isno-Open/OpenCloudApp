<script lang="ts">
  // Champ de formulaire : libelle, controle (passe en contenu), aide facultative. Meme forme partout.
  import type { Snippet } from 'svelte';
  interface Props { label: string; forId: string; hint?: string; children: Snippet; }
  const { label, forId, hint, children }: Props = $props();
</script>

<div class="field">
  <label for={forId}>{label}</label>
  {@render children()}
  {#if hint}<span class="hint">{hint}</span>{/if}
</div>
