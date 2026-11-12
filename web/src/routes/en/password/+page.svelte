<script lang="ts">
  import PasswordPage from '#lib/components/pages/PasswordPage.svelte';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
</script>

<PasswordPage {data} />
