<script lang="ts">
  // Theme choisi : ses polices et ses variables CSS. La feuille ne contient que des variables dont les
  // valeurs ont ete verifiees par le coeur (themes.ts : couleurs, familles de polices) ; rien de libre.
  import type { ShellTheme } from '#lib/shell.ts';
  const { theme }: { theme: ShellTheme } = $props();
</script>

<svelte:head>
  <link rel="icon" href={theme.icon.href} type={theme.icon.type} />
  {#if theme.fontsHref}<link rel="stylesheet" href={theme.fontsHref} />{/if}
  {#if theme.css}{@html `<style id="portal-theme">${theme.css}</style>`}{/if}
</svelte:head>
