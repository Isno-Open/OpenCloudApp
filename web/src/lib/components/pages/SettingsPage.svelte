<script lang="ts">
  // Parametres de l'instance : general (nom, messagerie), adresse du portail ; broker et base en
  // lecture seule, avec la raison.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import GeneralSettings from '#lib/components/screens/GeneralSettings.svelte';
  import PortalHostForm from '#lib/components/screens/PortalHostForm.svelte';
  import Panel from '#lib/components/ui/Panel.svelte';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import type { SettingsData } from '#lib/screen-data.ts';
  const { data }: { data: SettingsData } = $props();
  const s = $derived(t(data.lang));
</script>

<CloudLayout title={s.settingsTitle} lang={data.lang} altUrl={ROUTES.parametres[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.settingsTitle}</h1></div>
  <p class="lead">{s.settingsLead}</p>
  <GeneralSettings lang={data.lang} appName={data.appName} theme={data.theme} themeOptions={data.themeOptions} smtp={data.smtp} smtpOn={data.smtpOn} securityOptions={data.securityOptions} />
  <Panel title={s.instanceTitle} spaced>
    <PortalHostForm lang={data.lang} host={data.appHost} />
    <KeyValue label={s.brokerUrlLabel}>{data.brokerUrl} <span class="ro">{s.readonly}</span></KeyValue>
    <span class="hint">{s.brokerRoReason}</span>
    <KeyValue label={s.dbKindLabel}>{data.dbLabel} <span class="ro">{s.readonly}</span></KeyValue>
    <span class="hint">{s.dbRoReason}</span>
  </Panel>
</CloudLayout>
