<script lang="ts">
  // Icone declaree par un plugin (type d'appareil, carte de plugin), deja verifiee par le coeur
  // (icons.ts) : un caractere, un trace SVG dessine au trait, ou une petite image. Un seul dessin
  // pour tout le portail ; seule la taille vient de l'endroit (em).
  import type { Icon } from '@opencloudapp/core/plugin-contract.js';
  const { icon, label }: { icon: Icon; label: string } = $props();
</script>

{#if 'path' in icon}
  <svg class="icon-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label={label}><path d={icon.path}></path></svg>
{:else if 'src' in icon}
  <img class="icon-mark" src={icon.src} alt={label} />
{:else}
  <span class="icon-mark glyph" role="img" aria-label={label}>{icon.glyph}</span>
{/if}
