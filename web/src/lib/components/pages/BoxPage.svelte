<script lang="ts">
  // Ecran d'un boitier : en-tete (etat, firmware), puis onglets configuration et gestion.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import BoxDetail from '#lib/components/screens/BoxDetail.svelte';
  import { t, ROUTES, appareilHref, otherLang } from '#lib/i18n.ts';
  import type { BoxData } from '#lib/screen-data.ts';
  const { data }: { data: BoxData } = $props();
  const s = $derived(t(data.lang));
  const b = $derived(data.boitier);
</script>

<CloudLayout title={b.name} lang={data.lang} altUrl={appareilHref(b.id, otherLang(data.lang))} shell={data.shell}>
  <a class="back" href={ROUTES.appareils[data.lang]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"></path></svg> {s.backBoxes}</a>
  <div class="page-head">
    <h1>{b.name}</h1>
    <span class={['pill', { 'state-off': !b.online }]}><span class="dot"></span>{b.online ? s.online : s.offlineShort}</span>
    <span class="pill mono">{b.firmware}</span>
  </div>
  <p class="lead">{s.leadBoitier(b.id, b.count, b.uptime)}</p>
  <BoxDetail boitier={b} lang={data.lang} />
</CloudLayout>
