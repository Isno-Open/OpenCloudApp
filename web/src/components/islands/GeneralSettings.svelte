<script lang="ts">
  // Parametres > General : nom du portail et messagerie, enregistres d'un seul bouton ; essai d'envoi.
  import { t, type Lang } from '../../lib/i18n.ts';
  import { postJson, ignoreBody, field, type Parse } from '../../lib/api.ts';

  export type SmtpInitial = { host: string; port: number; security: string; user: string; passKept: boolean; fromEmail: string; fromName: string };
  interface Props {
    lang: Lang; appName: string; smtp: SmtpInitial; smtpOn: boolean;
    securityOptions: { value: string; label: string }[];
  }
  const props: Props = $props();
  const s = $derived(t(props.lang));

  // valeurs du formulaire, initialisees une fois depuis le serveur
  const init = (): SmtpInitial & { appName: string; pass: string } => ({ ...props.smtp, appName: props.appName, pass: '' });
  let f = $state(init());
  let msg = $state<{ ok: boolean | null; text: string }>({ ok: null, text: '' });
  let testing = $state(false);

  const parseTest: Parse<{ to: string }> = (b) => { const to = field(b, 'to'); return typeof to === 'string' ? { to } : null; };

  async function save(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    msg = { ok: null, text: '…' };
    const r = await postJson('/api/settings/general', {
      appName: f.appName,
      smtp: { host: f.host.trim(), port: Number(f.port), security: f.security, user: f.user.trim(), pass: f.pass, fromEmail: f.fromEmail.trim(), fromName: f.fromName.trim() },
    }, s.saveError, ignoreBody);
    msg = r.ok ? { ok: true, text: s.savedMsg } : { ok: false, text: r.error };
    if (r.ok) setTimeout(() => location.reload(), 600);
  }
  async function test(): Promise<void> {
    testing = true; msg = { ok: null, text: '…' };
    const r = await postJson('/api/settings/smtp-test', { lang: props.lang }, s.saveError, parseTest);
    msg = r.ok ? { ok: true, text: `${s.smtpTestOk} ${r.data.to}` } : { ok: false, text: r.error };
    testing = false;
  }
</script>

<form class="panel" id="generalForm" onsubmit={save}>
  <h3>{s.generalTitle}</h3>
  <div class="field"><label for="appName">{s.appNameLabel}</label><input id="appName" type="text" maxlength="60" bind:value={f.appName} placeholder="ISNO Cloud" /><span class="hint">{s.appNameHint}</span></div>

  <h4 class="subhead">{s.smtpTitle} {#if !props.smtpOn}<span class="ro">{s.smtpOff}</span>{/if}</h4>
  <p class="hint" style="margin:0 0 .5rem">{s.smtpIntro}</p>
  <div class="form-grid">
    <div class="field"><label for="smHost">{s.smtpHost}</label><input id="smHost" type="text" spellcheck="false" bind:value={f.host} placeholder="smtp.exemple.fr" /></div>
    <div class="field"><label for="smPort">{s.smtpPort}</label><input id="smPort" type="number" min="1" max="65535" bind:value={f.port} /></div>
    <div class="field"><label for="smSec">{s.smtpSecurity}</label>
      <select id="smSec" bind:value={f.security}>{#each props.securityOptions as o (o.value)}<option value={o.value}>{o.label}</option>{/each}</select>
    </div>
    <div class="field"><label for="smUser">{s.smtpUser}</label><input id="smUser" type="text" spellcheck="false" autocomplete="off" bind:value={f.user} /></div>
    <div class="field"><label for="smPass">{s.smtpPass}</label><input id="smPass" type="password" autocomplete="new-password" placeholder={props.smtp.passKept ? s.smtpPassKept : ''} bind:value={f.pass} /></div>
    <div class="field"><label for="smFrom">{s.smtpFrom}</label><input id="smFrom" type="email" spellcheck="false" bind:value={f.fromEmail} placeholder="portail@exemple.fr" /></div>
    <div class="field"><label for="smFromName">{s.smtpFromName}</label><input id="smFromName" type="text" maxlength="80" bind:value={f.fromName} placeholder={props.appName || 'ISNO Cloud'} /></div>
  </div>
  <div class="row end" style="margin-top:.6rem">
    <span class={['savemsg', { ok: msg.ok === true, err: msg.ok === false }]} id="generalMsg">{msg.text}</span>
    {#if props.smtpOn}<button class="btn ghost" type="button" id="smtpTestBtn" disabled={testing} onclick={test}>{s.smtpTest}</button>{/if}
    <button class="btn primary" type="submit">{s.saveBtn}</button>
  </div>
</form>
