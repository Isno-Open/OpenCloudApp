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

<!-- un champ comme ceux de l'edition d'un appareil sur le boitier (OpenProfalux) : le libelle, puis la
     saisie et son bouton sur UNE ligne, a la meme hauteur, puis la note dessous -->
<div class="pin-field" data-pin={idSuffix}>
  <label class="pin-label" for={`googlePin-${idSuffix}`}>{label}</label>
  <div class="pin-line">
    <input class="pin-in" id={`googlePin-${idSuffix}`} type="password" inputmode="numeric" autocomplete="off" minlength={GOOGLE_PIN.minLength} maxlength={GOOGLE_PIN.maxLength} bind:value={pin} />
    <button class="btn" type="button" data-pin-save disabled={busy} onclick={save}>{pinSet ? s.googlePinChange : s.googlePinSave}</button>
    {#if pinSet}<button class="btn ghost" type="button" data-pin-remove disabled={busy} onclick={remove}>{s.googlePinRemove}</button>{/if}
  </div>
  <span class="note">{status}</span>
  <ErrorText error={error} id={`googlePinErr-${idSuffix}`} />
</div>

<style>
  .pin-field { display: flex; flex-direction: column; gap: 6px; margin-top: .75rem; }
  .pin-label { font-weight: 600; }
  .pin-line { display: flex; align-items: stretch; gap: 8px; }
  .pin-in { flex: 1; min-width: 0; min-height: 44px; padding: 8px 10px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-elev); color: inherit; font: inherit; letter-spacing: .15em; }
  .pin-in:focus { outline: none; border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-weak); }
  .pin-line .btn { flex: none; }
  .pin-field .note { margin: 0; }
</style>
