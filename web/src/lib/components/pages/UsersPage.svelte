<script lang="ts">
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import UsersPanel from '#lib/components/screens/UsersPanel.svelte';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import type { UsersData } from '#lib/screen-data.ts';
  const { data }: { data: UsersData } = $props();
  const s = $derived(t(data.lang));
</script>

<CloudLayout title={s.usersTitle} lang={data.lang} altUrl={ROUTES.utilisateurs[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.usersTitle}</h1></div>
  <p class="lead">{s.usersLead}</p>
  <UsersPanel lang={data.lang} rows={data.rows} minPass={data.minPass} canInvite={data.canInvite} />
</CloudLayout>
