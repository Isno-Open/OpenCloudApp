<script lang="ts">
  // Bouton : une variante (primaire, discret, danger) et une taille. Toutes les autres proprietes
  // (data-*, id, title...) sont transmises telles quelles.
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';
  import { BUTTON, type ButtonVariant } from './button.ts';
  interface Props extends HTMLButtonAttributes { variant?: ButtonVariant; small?: boolean; children: Snippet; }
  const { variant = BUTTON.primary, small = false, type = 'button', children, ...rest }: Props = $props();
</script>

<button class={['btn', variant, { sm: small }]} {type} {...rest}>{@render children()}</button>
