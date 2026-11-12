<script lang="ts">
  // Ajouter un appareil : saisir le code du boitier, ou obtenir un code (firmware anterieur au QR).
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import LinkCodeForm from '#lib/components/LinkCodeForm.svelte';
  import PairCodeButton from '#lib/components/screens/PairCodeButton.svelte';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import type { AddData } from '#lib/screen-data.ts';
  const { data }: { data: AddData } = $props();
  const s = $derived(t(data.lang));
</script>

<CloudLayout title={s.addTitle} lang={data.lang} altUrl={ROUTES.ajouter[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.addTitle}</h1></div>
  <p class="lead">{s.addLead}</p>
  <div class="card"><LinkCodeForm lang={data.lang} /></div>
  <div class="card"><PairCodeButton lang={data.lang} /></div>
  <div class="card"><div class="sect-label">{s.howTitle}</div><p class="note">{s.howText}</p></div>
</CloudLayout>
