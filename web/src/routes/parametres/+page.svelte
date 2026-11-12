<script lang="ts">
  import SettingsPage from '#lib/components/pages/SettingsPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<SettingsPage {data} />
