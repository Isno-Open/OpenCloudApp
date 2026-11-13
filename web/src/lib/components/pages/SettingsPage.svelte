<script lang="ts">
  // Parametres de l'instance : general (nom, messagerie), adresse du portail ; broker et base en
  // lecture seule, avec la raison.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import GeneralSettings from '#lib/components/screens/GeneralSettings.svelte';
  import PortalHostForm from '#lib/components/screens/PortalHostForm.svelte';
  import Panel from '#lib/components/ui/Panel.svelte';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import SubTabs from '#lib/components/ui/SubTabs.svelte';
  import { SETTINGS_PART, isSettingsPart, type SettingsPart } from '#lib/settings-tabs.ts';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import type { SettingsData } from '#lib/screen-data.ts';
  const { data }: { data: SettingsData } = $props();
  const s = $derived(t(data.lang));
  let current = $state<string>(SETTINGS_PART.general);
  const part = $derived<SettingsPart>(isSettingsPart(current) ? current : SETTINGS_PART.general);
</script>

<CloudLayout title={s.settingsTitle} lang={data.lang} altUrl={ROUTES.parametres[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.settingsTitle}</h1></div>
  <p class="lead">{s.settingsLead}</p>
  <SubTabs label={s.settingsTitle} bind:current items={[
    { id: SETTINGS_PART.general, label: s.generalTitle },
    { id: SETTINGS_PART.mail, label: s.smtpTitle },
    { id: SETTINGS_PART.instance, label: s.instanceTitle },
  ]} />
  <div hidden={part === SETTINGS_PART.instance}>
  <GeneralSettings {part} lang={data.lang} appName={data.appName} theme={data.theme} themeOptions={data.themeOptions} smtp={data.smtp} smtpOn={data.smtpOn} securityOptions={data.securityOptions} />
  </div>
  <div hidden={part !== SETTINGS_PART.instance} data-part={SETTINGS_PART.instance}>
  <Panel title={s.instanceTitle}>
    <PortalHostForm lang={data.lang} host={data.appHost} />
    <KeyValue label={s.brokerUrlLabel}>{data.brokerUrl} <span class="ro">{s.readonly}</span></KeyValue>
    <span class="hint">{s.brokerRoReason}</span>
    <KeyValue label={s.dbKindLabel}>{data.dbLabel} <span class="ro">{s.readonly}</span></KeyValue>
    <span class="hint">{s.dbRoReason}</span>
  </Panel>
  </div>
</CloudLayout>
