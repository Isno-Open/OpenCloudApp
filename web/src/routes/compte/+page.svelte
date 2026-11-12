<script lang="ts">
  import AccountPage from '#lib/components/pages/AccountPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<AccountPage {data} />
