<script lang="ts">
  // Compte : identite (lecture seule), double authentification, deconnexion.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import AccountActions from '#lib/components/screens/AccountActions.svelte';
  import Panel from '#lib/components/ui/Panel.svelte';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import type { AccountData } from '#lib/screen-data.ts';
  const { data }: { data: AccountData } = $props();
  const s = $derived(t(data.lang));
  const a = $derived(data.account);
</script>

<CloudLayout title={s.accountTitle} lang={data.lang} altUrl={ROUTES.compte[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.accountTitle}</h1></div>
  <p class="lead">{s.accountLead}</p>
  <Panel title={s.identity} readonlyLabel={s.readonly}>
    {#if a.name}<KeyValue label={s.userName} value={a.name} />{/if}
    <KeyValue label={s.userLogin} value={a.email} />
    <KeyValue label={s.boxesWord} value={`${a.boitiers} / ${a.cap}`} />
  </Panel>
  <AccountActions lang={data.lang} home={ROUTES.appareils[data.lang]} totpOn={data.totpOn} totpRequired={data.totpRequired} totpEnabled={a.totpEnabled} />
</CloudLayout>
