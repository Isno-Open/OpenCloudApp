<script lang="ts">
  import BareLayout from '#lib/components/layout/BareLayout.svelte';
  import SetupWizard from '#lib/components/screens/SetupWizard.svelte';
  import type { SetupData } from '#lib/screen-data.ts';
  const { data }: { data: SetupData } = $props();
</script>

<BareLayout title="Configuration" lang={data.lang} portalName={data.shell.portalName} theme={data.shell.theme} app={data.shell.app}>
  <SetupWizard remaining={data.remaining} windowMin={data.windowMin} kinds={data.kinds} checkLabels={data.checkLabels}
    userAdminLabel={data.userAdminLabel} userAdminHint={data.userAdminHint} loginUrl={data.loginUrl} />
</BareLayout>
