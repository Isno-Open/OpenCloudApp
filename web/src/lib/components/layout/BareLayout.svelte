<script lang="ts">
  // Gabarit minimal (sans barre) pour la connexion, le mot de passe et l'installation.
  import type { Snippet } from 'svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { SPONSOR } from '#lib/sponsor.ts';
  import type { ShellTheme } from '#lib/shell.ts';
  import ThemeHead from './ThemeHead.svelte';
  interface Props { title?: string; lang: Lang; portalName: string; theme: ShellTheme; children: Snippet; }
  const { title, lang, portalName, theme, children }: Props = $props();
</script>

<ThemeHead {theme} />
<svelte:head><title>{title ? `${title} · ${portalName}` : portalName}</title></svelte:head>
<main class="bare-wrap">{@render children()}</main>
<p class="foot">{t(lang).footSponsor} <a href={SPONSOR.url} target="_blank" rel="noopener">{SPONSOR.name}</a></p>
