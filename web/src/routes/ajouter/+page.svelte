<script lang="ts">
  import AddPage from '#lib/components/pages/AddPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<AddPage {data} />
