<script lang="ts">
  // Gabarit de l'app. Ordinateur : barre du haut (marque, navigation avec pictogrammes, langue, theme).
  // Mobile : la barre du haut garde la marque et les reglages ; la navigation passe en barre d'onglets
  // EN BAS (comme une application), les entrees de l'operateur derriere « Plus ».
  import type { Snippet } from 'svelte';
  import { page } from '$app/state';
  import { otherLang, navActive, t, NAV_ICON, type Lang } from '#lib/i18n.ts';
  import { SPONSOR } from '#lib/sponsor.ts';
  import type { Shell } from '#lib/shell.ts';
  import LangFlag from './LangFlag.svelte';
  import Brand from './Brand.svelte';
  import ThemeHead from './ThemeHead.svelte';
  import AppHead from './AppHead.svelte';
  import NavIcon from './NavIcon.svelte';

  interface Props { title?: string; lang: Lang; altUrl: string; shell: Shell; children: Snippet; }
  const { title, lang, altUrl, shell, children }: Props = $props();
  const s = $derived(t(lang));
  const other = $derived(otherLang(lang));
  const path = $derived(page.url.pathname);
  const adminActive = $derived(shell.adminNav.some((n) => navActive(n, path)));

  let moreOpen = $state(false);
  let light = $state(false);
  $effect(() => { light = document.documentElement.getAttribute('data-theme') === 'light'; });
  function toggleTheme(): void {
    light = !light;
    if (light) document.documentElement.setAttribute('data-theme', 'light'); else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem('theme', light ? 'light' : 'dark'); } catch { /* stockage refuse : le theme vaut pour la page */ }
  }
</script>

<ThemeHead theme={shell.theme} />
<AppHead app={shell.app} />
<svelte:head>
  <title>{title ? `${title} · ${shell.portalName}` : shell.portalName}</title>
  <link rel="alternate" hreflang={lang} href={path} />
  <link rel="alternate" hreflang={other} href={altUrl} />
</svelte:head>
<svelte:window onkeydown={(e) => { if (e.key === 'Escape') moreOpen = false; }} />

{#snippet controls()}
  <a class="lang-switch" href={altUrl} hreflang={other} aria-label={s.langSwitch} data-sveltekit-reload><span class="flag"><LangFlag lang={other} /></span>{s.langName}</a>
  <button class="theme-toggle" id="themeToggle" type="button" aria-label={s.themeToggle} onclick={toggleTheme}>
    <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path></svg>
    <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path></svg>
  </button>
{/snippet}

<header class="topbar">
  <div class="topbar-inner">
    <a class="brand" href={shell.nav[0]?.href ?? '/'} aria-label={s.brandAria}><Brand {shell} withWaves /></a>
    <nav class="topnav" aria-label={s.navMain}>
      {#each shell.nav as n (n.href)}
        <a class={['nav', { active: navActive(n, path) }]} href={n.href} title={n.label}><NavIcon icon={n.icon} /><span>{n.label}</span></a>
      {/each}
      {#if shell.adminNav.length}
        <span class="nav-sep" aria-hidden="true"></span>
        {#each shell.adminNav as n (n.href)}
          <a class={['nav', { active: navActive(n, path) }]} href={n.href} title={n.label}><NavIcon icon={n.icon} /><span>{n.label}</span></a>
        {/each}
      {/if}
    </nav>
    <div class="topbar-controls">{@render controls()}</div>
  </div>
</header>

<main class="wrap">
  {@render children()}
</main>
<footer class="page-foot">{s.footSponsor} <a href={SPONSOR.url} target="_blank" rel="noopener">{SPONSOR.name}</a></footer>

<!-- mobile : barre d'onglets en bas -->
<nav class="tabbar" aria-label={s.navMain}>
  {#each shell.nav as n (n.href)}
    <a class={['tab', { active: navActive(n, path) }]} href={n.href} onclick={() => { moreOpen = false; }}><NavIcon icon={n.icon} /><span>{n.label}</span></a>
  {/each}
  {#if shell.adminNav.length}
    <button class={['tab', { active: adminActive || moreOpen }]} type="button" aria-expanded={moreOpen} aria-controls="moreSheet" onclick={() => { moreOpen = !moreOpen; }}><NavIcon icon={NAV_ICON.more} /><span>{s.navMore}</span></button>
  {/if}
</nav>
{#if moreOpen}
  <button class="sheet-backdrop" type="button" aria-label={s.menu} onclick={() => { moreOpen = false; }}></button>
  <div class="sheet" id="moreSheet">
    {#each shell.adminNav as n (n.href)}
      <a class={['sheet-item', { active: navActive(n, path) }]} href={n.href} onclick={() => { moreOpen = false; }}><NavIcon icon={n.icon} /><span>{n.label}</span></a>
    {/each}
  </div>
{/if}
