<script lang="ts">
  // /lier, appareil trouve : nommer et confirmer. Le boitier, qui interroge de son cote, recupere alors
  // son certificat ; l'ecran passe a « appareil lie ».
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, ROUTES, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody, field } from '#lib/api.ts';
  import { LINK_ERROR } from '#lib/link.ts';

  interface Props { lang: Lang; code: string; deviceId: string; }
  const { lang, code, deviceId }: Props = $props();
  const s = $derived(t(lang));

  let name = $state('');
  let busy = $state(false);
  let linked = $state(false);
  let error = $state<string | null>(null);

  async function confirm(): Promise<void> {
    busy = true; error = null;
    const r = await postJson('/api/device/approve', { code, name: name.trim() }, s.netErr, ignoreBody);
    if (r.ok) { linked = true; return; }
    busy = false;
    if (r.status === null) { error = s.netErr; return; }
    const cap = field(r.body, 'cap');
    error = field(r.body, 'error') === LINK_ERROR.cap && typeof cap === 'number' ? s.linkCapError(cap) : s.linkInvalid;
  }
</script>

{#if !linked}
  <div class="panel link-confirm" id="linkConfirm">
    <h3>{s.linkConfirmTitle}</h3>
    <div class="kv"><span class="k">Code</span><span class="v mono">{code}</span></div>
    <div class="kv"><span class="k">{s.linkIdWord}</span><span class="v mono">{deviceId}</span></div>
    <Field label={s.linkNameLabel} forId="link-name"><input id="link-name" type="text" maxlength="60" placeholder={s.linkNamePh} bind:value={name} /></Field>
    <div class="row end"><button class="btn primary" type="button" id="linkBtn" disabled={busy} onclick={confirm}>{s.linkConfirmBtn}</button></div>
    <ErrorText error={error} id="linkErr" />
  </div>
{:else}
  <div class="panel link-done" id="linkDone">
    <h3>{s.linkDoneTitle}</h3>
    <p class="note">{s.linkDoneNote}</p>
    <div class="row"><a class="btn primary" href={ROUTES.appareils[lang]}>{s.linkGoDevices}</a></div>
  </div>
{/if}
