<script lang="ts">
  // Pictogrammes de la navigation, au trait (un seul style, le meme sur tous les systemes, a la
  // difference des emoji). Un dessin par entree, declare une fois.
  import { NAV_ICON, type NavIcon } from '#lib/i18n.ts';
  const { icon }: { icon: NavIcon } = $props();
  const PATHS: Record<NavIcon, string> = {
    [NAV_ICON.devices]: 'M3 10.5 12 3l9 7.5M5 9v11h14V9M9.5 20v-6h5v6',
    [NAV_ICON.add]: 'M12 7v10M7 12h10M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    [NAV_ICON.account]: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
    [NAV_ICON.users]: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7M18 14a6 6 0 0 1 4 7',
    [NAV_ICON.plugins]: 'M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3h7z',
    [NAV_ICON.settings]: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4',
    [NAV_ICON.more]: 'M5 12h.01M12 12h.01M19 12h.01',
  };
</script>

<svg class="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width={icon === NAV_ICON.more ? 3 : 1.8} stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d={PATHS[icon]} /></svg>
