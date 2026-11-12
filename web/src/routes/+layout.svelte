<script lang="ts">
  // Racine : styles communs. Chaque page choisit son gabarit (CloudLayout ou BareLayout).
  import '#lib/styles/tokens.css';
  import '#lib/styles/cloud.css';
  import type { Snippet } from 'svelte';
  const { children }: { children: Snippet } = $props();
</script>

{@render children()}
