<script lang="ts">
  // Application installable (plugin actif) : manifeste, icone iOS, et enregistrement du service worker.
  import { onMount } from 'svelte';
  import type { ShellApp } from '#lib/shell.ts';
  const { app }: { app: ShellApp } = $props();
  const SW_PATH = '/service-worker.js';
  onMount(() => {
    if (app && 'serviceWorker' in navigator) navigator.serviceWorker.register(SW_PATH).catch(() => { /* sans service worker, le portail marche quand meme */ });
  });
</script>

<svelte:head>
  {#if app}
    <link rel="manifest" href={app.manifest} />
    <link rel="apple-touch-icon" href={app.appleIcon} />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
  {/if}
</svelte:head>
