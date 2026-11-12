<script lang="ts">
  import LinkPage from '#lib/components/pages/LinkPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<LinkPage {data} />
