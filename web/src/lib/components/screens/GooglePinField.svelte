<script lang="ts">
  // Une ligne de code PIN Google Home : son libelle, son etat, la saisie, et les boutons pour le choisir,
  // le changer ou le retirer. Sert au code du compte comme au code propre d'un portail (`appliance`) :
  // seul le contenu change. Le code n'est jamais reaffiche (il est garde hache).
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import { GOOGLE_PIN, normalizeGooglePin } from '@opencloudapp/core/plugins/google-pin-rule.js';

  /** appliance : identifiant du portail, ou null pour le code du compte. status : ce qui le protege. */
  interface Props { lang: Lang; label: string; status: string; pinSet: boolean; appliance: string | null; idSuffix: string; }
  const { lang, label, status, pinSet, appliance, idSuffix }: Props = $props();
  const s = $derived(t(lang));
  const target = $derived(appliance === null ? {} : { appliance });

  let pin = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  async function save(): Promise<void> {
    if (normalizeGooglePin(pin) === null) { error = s.googlePinInvalid; return; }
    busy = true; error = null;
    const r = await postJson('/api/account/google-pin/set', { ...target, pin }, s.saveError, ignoreBody);
    busy = false;
    if (r.ok) location.reload(); else error = r.error;
  }
  async function remove(): Promise<void> {
    busy = true; error = null;
    const r = await postJson('/api/account/google-pin/clear', target, s.saveError, ignoreBody);
    busy = false;
    if (r.ok) location.reload(); else error = r.error;
  }
</script>

<div class="pin-field" data-pin={idSuffix}>
  <div class="pin-head"><span class="pin-label">{label}</span><span class="note">{status}</span></div>
  <div class="row">
    <input class="code-in" id={`googlePin-${idSuffix}`} type="password" inputmode="numeric" autocomplete="off" aria-label={label} minlength={GOOGLE_PIN.minLength} maxlength={GOOGLE_PIN.maxLength} bind:value={pin} />
    <button class="btn primary sm" type="button" data-pin-save disabled={busy} onclick={save}>{pinSet ? s.googlePinChange : s.googlePinSave}</button>
    {#if pinSet}<button class="btn ghost sm" type="button" data-pin-remove disabled={busy} onclick={remove}>{s.googlePinRemove}</button>{/if}
  </div>
  <ErrorText error={error} id={`googlePinErr-${idSuffix}`} />
</div>

<style>
  .pin-field { margin-top: .7rem; }
  .pin-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: .5rem; margin-bottom: .3rem; }
  .pin-label { font-weight: 550; }
  .pin-head .note { margin: 0; }
</style>
