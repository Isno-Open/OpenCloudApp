<script lang="ts">
  import SetupPage from '#lib/components/pages/SetupPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<SetupPage {data} />
