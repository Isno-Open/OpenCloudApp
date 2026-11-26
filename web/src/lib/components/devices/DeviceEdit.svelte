<script lang="ts">
  // L'edition d'un appareil, sous sa ligne dans la liste des appareils d'un boitier (meme forme que sur le
  // boitier lui-meme) : ce qu'on sait de lui, puis ses reglages sous UN bouton. Les champs viennent de ce
  // que son type declare ; le pilotage reste sur sa carte (DeviceCard).
  import { CONTROL, DEVICE_SETTING, type ControlValue } from '@opencloudapp/core/family-contract.js';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { Appareil, KnownAppareil } from '#lib/types.ts';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import { GOOGLE_PIN, normalizeGooglePin } from '@opencloudapp/core/plugins/google-pin-rule.js';
  import SettingsForm from '@isno-open/plugin-host/svelte/SettingsForm.svelte';
  import { SETTING_KIND, TEXT_FORMAT, type SettingField, type SettingValue } from '@opencloudapp/core/plugin-contract.js';

  /** siblings : les autres appareils du meme boitier (un reglage peut en choisir, ex. membres d'une centrale) */
  interface Props { appareil: KnownAppareil; siblings: readonly Appareil[]; lang: Lang; }
  const { appareil: a, siblings, lang }: Props = $props();
  const s = $derived(t(lang));
  const num = (v: ControlValue | undefined): number | null => (typeof v === 'number' ? v : null);
  const position = $derived(a.kind.controls.find((c) => c.kind === CONTROL.position && !a.hidden.includes(c.id)));
  const pos = $derived(position ? num(a.values[position.id]) : null);

  // reglages de l'appareil (champs declares par son type) : enregistres par le boitier, qui republie
  // ses valeurs ; l'ecran de reglages est celui du moteur partage, le meme pour tous les plugins
  // un choix d'appareils devient un choix multiple : une case par appareil du boitier d'un type permis,
  // par son nom (l'ecran partage ne connait pas les boitiers)
  const deviceFields = $derived((a.kind.settings ?? []).map((f): SettingField => f.kind !== DEVICE_SETTING.devices ? f : {
    kind: SETTING_KIND.multi, key: f.key, label: f.label, ...(f.hint ? { hint: f.hint } : {}),
    options: siblings.filter((o) => o.slug !== a.slug && o.kind !== null && f.kinds.includes(o.kind.id)).map((o) => ({ value: o.slug, label: { fr: o.name, en: o.name } })),
  }));
  // le code que Google exige pour CET appareil se regle dans le MEME formulaire, sous le meme bouton : une
  // case (il a son propre code, ou celui du compte) et la saisie dessous. Ces deux champs sont au portail,
  // pas a la famille : a l'enregistrement ils partent vers le compte, pas vers le boitier. Le code n'est
  // jamais reaffiche (il est garde hache) : une saisie vide garde le code en place.
  const PIN_FIELD = { own: 'google-pin-own', code: 'google-pin-code' } as const;
  const fr = t('fr'), en = t('en');
  const pinFields = $derived<SettingField[]>(a.googlePinSet === undefined ? [] : [
    { kind: SETTING_KIND.toggle, key: PIN_FIELD.own, label: { fr: fr.googlePinOwnToggle, en: en.googlePinOwnToggle } },
    { kind: SETTING_KIND.text, key: PIN_FIELD.code, under: PIN_FIELD.own, format: TEXT_FORMAT.plain, maxLength: GOOGLE_PIN.maxLength, label: { fr: fr.googlePinCodeLabel, en: en.googlePinCodeLabel },
      hint: a.googlePinSet ? { fr: fr.googlePinKeepHint, en: en.googlePinKeepHint } : { fr: fr.googlePinCodeHint, en: en.googlePinCodeHint } },
  ]);
  const settingsFields = $derived([...deviceFields, ...pinFields]);
  const settingsValues = $derived({ ...a.settings, ...(a.googlePinSet === undefined ? {} : { [PIN_FIELD.own]: a.googlePinSet, [PIN_FIELD.code]: '' }) });
  // ce que l'enregistrement fera du code propre, decide AVANT tout envoi : une saisie refusee n'enregistre rien
  const PIN_STEP = { none: 'none', clear: 'clear', set: 'set', invalid: 'invalid' } as const;
  type PinStep = (typeof PIN_STEP)[keyof typeof PIN_STEP];
  function pinStep(own: boolean, code: string): PinStep {
    if (a.googlePinSet === undefined) return PIN_STEP.none;
    if (!own) return a.googlePinSet ? PIN_STEP.clear : PIN_STEP.none;
    // rien de saisi : le code en place reste, mais il en faut un
    if (code === '') return a.googlePinSet ? PIN_STEP.none : PIN_STEP.invalid;
    return normalizeGooglePin(code) === null ? PIN_STEP.invalid : PIN_STEP.set;
  }
  async function saveSettings(values: Record<string, SettingValue>): Promise<boolean> {
    const { [PIN_FIELD.own]: own, [PIN_FIELD.code]: typed, ...device } = values;
    const code = typeof typed === 'string' ? typed.trim() : '';
    const step = pinStep(own === true, code);
    if (step === PIN_STEP.invalid) return false;
    if (deviceFields.length && !(await postJson('/api/device/settings', { device_id: a.boitierId, slug: a.slug, values: device }, s.saveError, ignoreBody)).ok) return false;
    if (step === PIN_STEP.none) return true;
    const r = step === PIN_STEP.set
      ? await postJson('/api/account/google-pin/set', { appliance: a.id, pin: code }, s.saveError, ignoreBody)
      : await postJson('/api/account/google-pin/clear', { appliance: a.id }, s.saveError, ignoreBody);
    // l'etat du code vient du serveur : la page le relit quand il a change
    if (r.ok) location.reload();
    return r.ok;
  }
</script>

<div class="dev-edit" data-edit={a.slug}>
  <div class="dev-facts">
    <KeyValue label={s.typeWord} value={a.kind.label[lang]} />
    {#if pos !== null}<KeyValue label={s.posWord} value={`${pos} %`} />{/if}
    {#if a.rssiDbm != null}<KeyValue label={s.wifiSignal} value={s.radioState(a.rssiDbm)} />{/if}
    {#if !a.online}<KeyValue label={s.state} value={s.offline} />{/if}
  </div>
  {#if settingsFields.length}
    <div class="dev-settings" data-settings={a.slug}>
      <SettingsForm fields={settingsFields} values={settingsValues} {lang} onSave={saveSettings} idPrefix={`set-${a.boitierId}-${a.slug}`} />
    </div>
  {/if}
</div>

<style>
  .dev-edit { display: grid; gap: 16px; padding: 16px 14px; border: 1px solid var(--accent-line); border-top: 0; border-radius: 0 0 var(--radius-sm) var(--radius-sm); background: var(--surface); }
  .dev-facts { display: grid; gap: .4rem; }
  /* l'ecran de reglages partage, aux couleurs du portail */
  .dev-settings { --oph-border: var(--border); --oph-input: var(--bg-elev); --oph-muted: var(--text-muted); --oph-danger: var(--danger); --oph-accent: var(--accent); }
</style>
