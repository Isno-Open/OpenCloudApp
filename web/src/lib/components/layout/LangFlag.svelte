<script lang="ts">
  // Drapeau du selecteur de langue, identique au site isno.fr.
  import { LANG, type Lang } from '#lib/i18n.ts';
  const { lang }: { lang: Lang } = $props();
</script>

{#if lang === LANG.fr}
  <svg viewBox="0 0 3 2" aria-hidden="true"><rect width="3" height="2" fill="#fff"/><rect width="1" height="2" fill="#0055A4"/><rect x="2" width="1" height="2" fill="#EF4135"/></svg>
{:else}
  <svg viewBox="0 0 60 30" aria-hidden="true"><clipPath id="lsuk"><path d="M0 0v30h60V0z"/></clipPath><g clip-path="url(#lsuk)"><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" stroke="#C8102E" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></g></svg>
{/if}
