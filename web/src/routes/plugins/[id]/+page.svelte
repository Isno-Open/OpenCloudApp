<script lang="ts">
  import PluginSettingsPage from '#lib/components/pages/PluginSettingsPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<PluginSettingsPage {data} />
