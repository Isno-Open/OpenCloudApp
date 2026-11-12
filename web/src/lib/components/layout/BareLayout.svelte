<script lang="ts">
  // Gabarit minimal (sans barre) pour la connexion, le mot de passe et l'installation.
  import type { Snippet } from 'svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { SPONSOR } from '#lib/sponsor.ts';
  import type { ShellTheme } from '#lib/shell.ts';
  import type { ShellApp } from '#lib/shell.ts';
  import ThemeHead from './ThemeHead.svelte';
  import AppHead from './AppHead.svelte';
  interface Props { title?: string; lang: Lang; portalName: string; theme: ShellTheme; app: ShellApp; children: Snippet; }
  const { title, lang, portalName, theme, app, children }: Props = $props();
</script>

<ThemeHead {theme} />
<AppHead {app} />
<svelte:head><title>{title ? `${title} · ${portalName}` : portalName}</title></svelte:head>
<main class="bare-wrap">{@render children()}</main>
<p class="foot">{t(lang).footSponsor} <a href={SPONSOR.url} target="_blank" rel="noopener">{SPONSOR.name}</a></p>
