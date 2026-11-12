<script lang="ts">
  // Reglages d'un plugin : le cadre est le meme pour tous, le contenu vient de ce que le plugin declare.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import PluginSettingsForm from '#lib/components/screens/PluginSettingsForm.svelte';
  import { t, ROUTES, pluginHref, otherLang } from '#lib/i18n.ts';
  import type { PluginSettingsData } from '#lib/screen-data.ts';
  const { data }: { data: PluginSettingsData } = $props();
  const s = $derived(t(data.lang));
</script>

<CloudLayout title={data.plugin.title} lang={data.lang} altUrl={pluginHref(data.plugin.id, otherLang(data.lang))} shell={data.shell}>
  <a class="backlink" href={ROUTES.plugins[data.lang]}>← {s.pluginsTitle}</a>
  <div class="page-head"><h1>{data.plugin.title}</h1></div>
  <p class="lead">{s.pluginSettingsLead} <span class="ro">{data.plugin.builtin ? s.pluginBuiltin : s.pluginExternal}</span></p>
  <PluginSettingsForm lang={data.lang} pluginId={data.plugin.id} fields={data.fields} values={data.values} />
</CloudLayout>
