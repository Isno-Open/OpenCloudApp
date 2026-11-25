<script lang="ts">
  // Ecran Compte : le code PIN que Google exige pour ouvrir un portail. Le code n'est jamais reaffiche
  // (il est garde hache) : on ne montre que s'il est choisi, et on permet de le changer ou de le retirer.
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import { GOOGLE_PIN, normalizeGooglePin } from '@opencloudapp/core/plugins/google-pin-rule.js';

  interface Props { lang: Lang; pinSet: boolean; }
  const { lang, pinSet }: Props = $props();
  const s = $derived(t(lang));

  let pin = $state('');
  let error = $state<string | null>(null);
  let busy = $state(false);

  async function save(): Promise<void> {
    if (normalizeGooglePin(pin) === null) { error = s.googlePinInvalid; return; }
    busy = true; error = null;
    const r = await postJson('/api/account/google-pin/set', { pin }, s.saveError, ignoreBody);
    busy = false;
    if (r.ok) location.reload(); else error = r.error;
  }
  async function remove(): Promise<void> {
    busy = true; error = null;
    const r = await postJson('/api/account/google-pin/clear', {}, s.saveError, ignoreBody);
    busy = false;
    if (r.ok) location.reload(); else error = r.error;
  }
</script>

<div class="panel" id="googlePinPanel" style="margin-top:.9rem">
  <h3>{s.googlePinTitle}</h3>
  <p class="note">{s.googlePinIntro}</p>
  <p class="note">{pinSet ? `✓ ${s.googlePinOnNote}` : s.googlePinOffNote}</p>
  <div class="row" style="margin-top:.5rem">
    <input class="code-in" id="googlePin" type="password" inputmode="numeric" autocomplete="off" minlength={GOOGLE_PIN.minLength} maxlength={GOOGLE_PIN.maxLength} bind:value={pin} />
    <button class="btn primary sm" type="button" id="googlePinSaveBtn" disabled={busy} onclick={save}>{pinSet ? s.googlePinChange : s.googlePinSave}</button>
    {#if pinSet}<button class="btn ghost sm" type="button" id="googlePinRemoveBtn" disabled={busy} onclick={remove}>{s.googlePinRemove}</button>{/if}
  </div>
  <ErrorText error={error} id="googlePinErr" />
</div>
