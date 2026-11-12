<script lang="ts">
  import UsersPage from '#lib/components/pages/UsersPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<UsersPage {data} />
