<script lang="ts">
  import BoxPage from '#lib/components/pages/BoxPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<BoxPage {data} />
