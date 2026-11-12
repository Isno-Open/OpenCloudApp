<script lang="ts">
  import LoginPage from '#lib/components/pages/LoginPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<LoginPage {data} />
