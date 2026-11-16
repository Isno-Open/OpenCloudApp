<script lang="ts">
  // /lier, appareil trouve : nommer et confirmer. Le boitier, qui interroge de son cote, recupere alors
  // son certificat. L'ecran attend qu'il soit connecte (avec ses appareils), puis emmene sur l'accueil :
  // y aller tout de suite montrait « 0 appareil », le boitier n'etant pas encore arrive (2026-11-16).
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, ROUTES, type Lang } from '#lib/i18n.ts';
  import { postJson, getJson, ignoreBody, field } from '#lib/api.ts';
  import { goto } from '$app/navigation';
  import { LINK_ERROR } from '#lib/link.ts';

  interface Props { lang: Lang; code: string; deviceId: string; }
  const { lang, code, deviceId }: Props = $props();
  const s = $derived(t(lang));

  let name = $state('');
  let busy = $state(false);
  let linked = $state(false);
  let error = $state<string | null>(null);
  let late = $state(false);   // le boitier n'est pas arrive dans le delai : on le dit, le lien reste

  const WAIT_POLL_MS = 1500;
  const WAIT_MAX_MS = 90_000;      // le boitier interroge toutes les 5 s, puis se connecte : large
  const QUIET_ONLINE_POLLS = 3;    // en ligne sans appareil annonce : un boitier vide, on y va quand meme
  type Linked = { paired: boolean; online: boolean; devices: number };
  const parseLinked = (b: unknown): Linked | null => {
    const p = field(b, 'paired'), o = field(b, 'online'), d = field(b, 'devices');
    return typeof p === 'boolean' && typeof o === 'boolean' && typeof d === 'number' ? { paired: p, online: o, devices: d } : null;
  };

  async function waitForBox(id: string): Promise<void> {
    const until = Date.now() + WAIT_MAX_MS;
    let onlineSeen = 0;
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, WAIT_POLL_MS));
      const r = await getJson(`/api/device/linked?device_id=${encodeURIComponent(id)}`, s.netErr, parseLinked);
      if (!r.ok || !r.data.online) continue;
      onlineSeen++;
      if (r.data.devices > 0 || onlineSeen >= QUIET_ONLINE_POLLS) { await goto(ROUTES.appareils[lang], { invalidateAll: true }); return; }
    }
    late = true;
  }

  async function confirm(): Promise<void> {
    busy = true; error = null;
    const r = await postJson('/api/device/approve', { code, name: name.trim() }, s.netErr, ignoreBody);
    if (r.ok) { linked = true; void waitForBox(deviceId); return; }
    busy = false;
    if (r.status === null) { error = s.netErr; return; }
    const cap = field(r.body, 'cap');
    const err = field(r.body, 'error');
    error = err === LINK_ERROR.cap && typeof cap === 'number' ? s.linkCapError(cap) : err === LINK_ERROR.nameTaken ? s.nameTaken(name.trim()) : s.linkInvalid;
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
    {#if !late}
      <p class="note" aria-live="polite"><span class="spinner" aria-hidden="true"></span> {s.linkDoneNote}</p>
    {:else}
      <p class="note" aria-live="polite">{s.linkLateNote}</p>
      <div class="row"><a class="btn primary" href={ROUTES.appareils[lang]}>{s.linkGoDevices}</a></div>
    {/if}
  </div>
{/if}
