<script lang="ts">
  import DevicesPage from '#lib/components/pages/DevicesPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<DevicesPage {data} />
