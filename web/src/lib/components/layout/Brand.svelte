<script lang="ts">
  // Marque du portail : le logo du theme s'il en a un (sinon les ondes ISNO), puis son nom s'il a ete
  // personnalise, sinon « isno.fr ». Meme rendu dans la barre et au-dessus des ecrans de connexion.
  import type { Shell } from '#lib/shell.ts';
  const { shell, withWaves = false }: { shell: Pick<Shell, 'portalName' | 'portalNameIsCustom' | 'theme'>; withWaves?: boolean } = $props();
</script>

{#if shell.theme.logo?.srcLight}
  <!-- deux logos : celui du mode clair remplace l'autre sur fond clair (cloud.css) -->
  <img class="brand-logo on-dark" src={shell.theme.logo.src} alt={shell.theme.logo.alt} />
  <img class="brand-logo on-light" src={shell.theme.logo.srcLight} alt={shell.theme.logo.alt} />
{:else if shell.theme.logo}
  <img class="brand-logo" src={shell.theme.logo.src} alt={shell.theme.logo.alt} />
{:else if withWaves}
  <svg class="rf" viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="6" cy="14" r="2.6" fill="currentColor"></circle>
    <g fill="none" stroke="currentColor" stroke-linecap="round">
      <path d="M11 8 A8 8 0 0 1 11 20" stroke-width="2.2"></path>
      <path d="M15.5 5 A12.5 12.5 0 0 1 15.5 23" stroke-width="2.2" opacity=".65"></path>
      <path d="M20 2.5 A16.5 16.5 0 0 1 20 25.5" stroke-width="2" opacity=".38"></path>
    </g>
  </svg>
{/if}
{#if shell.portalNameIsCustom}<span>{shell.portalName}</span>{:else}<span>isno<span class="tld">.fr</span></span>{/if}
