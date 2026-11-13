<script lang="ts">
  // Parametres > General et Messagerie : nom du portail et messagerie (le theme se choisit sur la page Plugins), enregistres d'un seul
  // bouton ; essai d'envoi. Un seul formulaire pour deux onglets : `part` dit lequel est montre, les
  // champs de l'autre restent dans le formulaire (et partent avec lui).
  import { SAVE, type SaveState } from '#lib/components/ui/save.ts';
  import SaveMessage from '#lib/components/ui/SaveMessage.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody, field, type Parse } from '#lib/api.ts';

  import { SETTINGS_PART, type SettingsPart } from '#lib/settings-tabs.ts';
  export type SmtpInitial = { host: string; port: number; security: string; user: string; passKept: boolean; fromEmail: string; fromName: string };
  interface Props {
    lang: Lang; appName: string; smtp: SmtpInitial; smtpOn: boolean;
    securityOptions: { value: string; label: string }[];
    part: SettingsPart;
  }
  const props: Props = $props();
  const s = $derived(t(props.lang));

  // valeurs du formulaire, initialisees une fois depuis le serveur
  const init = (): SmtpInitial & { appName: string; pass: string } => ({ ...props.smtp, appName: props.appName, pass: '' });
  let f = $state(init());
  let msg = $state<{ state: SaveState; text: string }>({ state: SAVE.idle, text: '' });
  let testing = $state(false);

  const parseTest: Parse<{ to: string }> = (b) => { const to = field(b, 'to'); return typeof to === 'string' ? { to } : null; };

  async function save(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    msg = { state: SAVE.pending, text: '' };
    const r = await postJson('/api/settings/general', {
      appName: f.appName,
      smtp: { host: f.host.trim(), port: Number(f.port), security: f.security, user: f.user.trim(), pass: f.pass, fromEmail: f.fromEmail.trim(), fromName: f.fromName.trim() },
    }, s.saveError, ignoreBody);
    msg = r.ok ? { state: SAVE.ok, text: s.savedMsg } : { state: SAVE.err, text: r.error };
    if (r.ok) setTimeout(() => location.reload(), 600);
  }
  async function test(): Promise<void> {
    testing = true; msg = { state: SAVE.pending, text: '' };
    const r = await postJson('/api/settings/smtp-test', { lang: props.lang }, s.saveError, parseTest);
    msg = r.ok ? { state: SAVE.ok, text: `${s.smtpTestOk} ${r.data.to}` } : { state: SAVE.err, text: r.error };
    testing = false;
  }
</script>

<form class="panel" id="generalForm" onsubmit={save}>
  <div hidden={props.part !== SETTINGS_PART.general} data-part={SETTINGS_PART.general}>
  <Field label={s.appNameLabel} forId="appName" hint={s.appNameHint}><input id="appName" type="text" maxlength="60" bind:value={f.appName} placeholder="ISNO Cloud" /></Field>
  </div>

  <div hidden={props.part !== SETTINGS_PART.mail} data-part={SETTINGS_PART.mail}>
  <p class="hint" style="margin:0 0 .5rem">{s.smtpIntro} {#if !props.smtpOn}<span class="ro">{s.smtpOff}</span>{/if}</p>
  <div class="form-grid">
    <Field label={s.smtpHost} forId="smHost"><input id="smHost" type="text" spellcheck="false" bind:value={f.host} placeholder="smtp.exemple.fr" /></Field>
    <Field label={s.smtpPort} forId="smPort"><input id="smPort" type="number" min="1" max="65535" bind:value={f.port} /></Field>
    <Field label={s.smtpSecurity} forId="smSec">
      <select id="smSec" bind:value={f.security}>{#each props.securityOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}</select>
    </Field>
    <Field label={s.smtpUser} forId="smUser"><input id="smUser" type="text" spellcheck="false" autocomplete="off" bind:value={f.user} /></Field>
    <Field label={s.smtpPass} forId="smPass"><input id="smPass" type="password" autocomplete="new-password" placeholder={props.smtp.passKept ? s.smtpPassKept : ''} bind:value={f.pass} /></Field>
    <Field label={s.smtpFrom} forId="smFrom"><input id="smFrom" type="email" spellcheck="false" bind:value={f.fromEmail} placeholder="portail@exemple.fr" /></Field>
    <Field label={s.smtpFromName} forId="smFromName"><input id="smFromName" type="text" maxlength="80" bind:value={f.fromName} placeholder={props.appName || 'ISNO Cloud'} /></Field>
  </div>
  </div>
  <div class="row end" style="margin-top:.6rem">
    <SaveMessage state={msg.state} text={msg.text} id="generalMsg" />
    {#if props.smtpOn && props.part === SETTINGS_PART.mail}<button class="btn ghost" type="button" id="smtpTestBtn" disabled={testing} onclick={test}>{s.smtpTest}</button>{/if}
    <button class="btn primary" type="submit">{s.saveBtn}</button>
  </div>
</form>
