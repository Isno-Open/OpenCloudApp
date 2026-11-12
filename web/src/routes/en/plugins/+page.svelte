<script lang="ts">
  import PluginsPage from '#lib/components/pages/PluginsPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<PluginsPage {data} />
