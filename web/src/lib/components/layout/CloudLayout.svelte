<script lang="ts">
  // Gabarit de l'app : barre (marque, navigation, langue, theme), contenu, pied. La navigation et le
  // nom du portail viennent du serveur (page.data.shell, prepare par +layout.server.ts).
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { otherLang, navActive, t, type Lang } from '#lib/i18n.ts';
  import { SPONSOR } from '#lib/sponsor.ts';
  import type { Shell } from '#lib/shell.ts';
  import LangFlag from './LangFlag.svelte';
  import Brand from './Brand.svelte';
  import ThemeHead from './ThemeHead.svelte';

  interface Props { title?: string; lang: Lang; altUrl: string; shell: Shell; children: Snippet; }
  const { title, lang, altUrl, shell, children }: Props = $props();
  const s = $derived(t(lang));
  const other = $derived(otherLang(lang));
  const path = $derived(page.url.pathname);

  let menuOpen = $state(false);
  let light = $state(false);
  $effect(() => { light = document.documentElement.getAttribute('data-theme') === 'light'; });
  function toggleTheme(): void {
    light = !light;
    if (light) document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch { /* stockage refuse : le theme vaut pour la page */ }
  }
</script>

<svelte:head>
  <title>{title ? `${title} · ${shell.portalName}` : shell.portalName}</title>
  <link rel="alternate" hreflang={lang} href={path} />
  <link rel="alternate" hreflang={other} href={altUrl} />
</svelte:head>
<ThemeHead theme={shell.theme} />
<svelte:window onkeydown={(e) => { if (e.key === 'Escape') menuOpen = false; }} />

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href={shell.nav[0]?.href ?? '/'} aria-label={s.brandAria}><Brand {shell} withWaves /></a>
    <button class="burger" id="menuToggle" type="button" aria-label={s.menu} aria-expanded={menuOpen} aria-controls="navLinks" onclick={() => { menuOpen = !menuOpen; }}>
      <svg class="bars" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"></path></svg>
      <svg class="x" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5 19 19M19 5 5 19"></path></svg>
    </button>
    <nav class={['topbar-links', { open: menuOpen }]} id="navLinks">
      {#each shell.nav as n (n.href)}
        <a class={['nav', { active: navActive(n, path) }]} href={n.href} onclick={() => { menuOpen = false; }}>{n.label}</a>
      {/each}
      <div class="topbar-controls">
        <a class="lang-switch" href={altUrl} hreflang={other} aria-label={s.langSwitch} data-sveltekit-reload><span class="flag"><LangFlag lang={other} /></span>{s.langName}</a>
        <button class="theme-toggle" id="themeToggle" type="button" aria-label={s.themeToggle} onclick={toggleTheme}>
          <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
          <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>
        </button>
      </div>
    </nav>
  </div>
</header>

<main class="wrap">
  {@render children()}
  <p class="foot">{s.footSponsor} <a href={SPONSOR.url} target="_blank" rel="noopener">{SPONSOR.name}</a></p>
</main>
