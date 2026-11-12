<script lang="ts">
  // Ecrans de connexion et de mot de passe : la marque au-dessus de la boite. Meme cadre pour tous.
  import type { Snippet } from 'svelte';
  import type { Shell } from '#lib/shell.ts';
  import Brand from './Brand.svelte';
  const { shell, children }: { shell: Shell; children: Snippet } = $props();
</script>

<div class="login"><span class="login-mark"><Brand {shell} /></span>{@render children()}</div>
