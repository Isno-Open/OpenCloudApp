<script lang="ts">
  import UserDetailPage from '#lib/components/pages/UserDetailPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<UserDetailPage {data} />
