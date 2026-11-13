<script lang="ts">
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import PluginsPanel from '#lib/components/screens/PluginsPanel.svelte';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import type { PluginsData } from '#lib/screen-data.ts';
  const { data }: { data: PluginsData } = $props();
  const s = $derived(t(data.lang));
</script>

<CloudLayout title={s.pluginsTitle} lang={data.lang} altUrl={ROUTES.plugins[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.pluginsTitle}</h1></div>
  <p class="lead">{s.pluginsLead}</p>
  <PluginsPanel lang={data.lang} cards={data.cards} sources={data.sources} catalogError={data.catalogError} />
</CloudLayout>
