<script lang="ts">
  // Carte d'un appareil d'un type connu : ses CONTROLES, tels que sa famille les declare dans le
  // vocabulaire fixe par le coeur (family-contract.ts). Le cadre est le meme pour tous (DeviceFrame) ;
  // seul le contenu, venu de la declaration, change. Le relais recoit la commande et la famille la
  // traduit pour le boitier.
  import { CONTROL, DEVICE_SETTING, type ControlDecl, type ControlValue } from '@opencloudapp/core/family-contract.js';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { Appareil, KnownAppareil } from '#lib/types.ts';
  import type { Snippet } from 'svelte';
  import DeviceFrame from './DeviceFrame.svelte';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import IconMark from '#lib/components/ui/IconMark.svelte';
  import GearIcon from '#lib/components/ui/GearIcon.svelte';
  import GooglePinField from '#lib/components/screens/GooglePinField.svelte';
  import SettingsForm from '@isno-open/plugin-host/svelte/SettingsForm.svelte';
  import { SETTING_KIND, type SettingField, type SettingValue } from '@opencloudapp/core/plugin-contract.js';

  /** siblings : les autres appareils du meme boitier (un reglage peut en choisir, ex. membres d'une centrale) */
  interface Props { appareil: KnownAppareil; siblings: readonly Appareil[]; boitierName: string; lang: Lang; grouped?: boolean; grip?: Snippet; }
  const { appareil: a, siblings, boitierName, lang, grouped = false, grip }: Props = $props();
  const s = $derived(t(lang));
  const SENDING_MS = 400;   // retour visuel du bouton presse

  const shown = $derived(a.kind.controls.filter((c) => !a.hidden.includes(c.id)));
  const actions = $derived(shown.filter((c) => c.kind === CONTROL.action));
  const position = $derived(shown.find((c) => c.kind === CONTROL.position));
  const others = $derived(shown.filter((c) => c.kind !== CONTROL.action && c.kind !== CONTROL.position));
  const num = (v: ControlValue | undefined): number | null => (typeof v === 'number' ? v : null);
  const pos = $derived(position ? num(a.values[position.id]) : null);

  let showDetails = $state(false);
  let sending = $state<string | null>(null);
  // action a confirmer (ex. supprimer) : la question s'affiche dans la carte, pas dans une boite du navigateur
  let asking = $state<string | null>(null);
  async function send(control: string, value: ControlValue | null = null): Promise<void> {
    sending = control;
    await postJson('/api/cmd', { device_id: a.boitierId, slug: a.slug, control, value }, s.netErr, ignoreBody);
    setTimeout(() => { sending = null; }, SENDING_MS);
  }
  // reglages de l'appareil (champs declares par son type) : enregistres par le boitier, qui republie
  // ses valeurs ; l'ecran de reglages est celui du moteur partage, le meme pour tous les plugins
  // un choix d'appareils devient un choix multiple : une case par appareil du boitier d'un type permis,
  // par son nom (l'ecran partage ne connait pas les boitiers)
  const settingsFields = $derived((a.kind.settings ?? []).map((f): SettingField => f.kind !== DEVICE_SETTING.devices ? f : {
    kind: SETTING_KIND.multi, key: f.key, label: f.label, ...(f.hint ? { hint: f.hint } : {}),
    options: siblings.filter((o) => o.slug !== a.slug && o.kind !== null && f.kinds.includes(o.kind.id)).map((o) => ({ value: o.slug, label: { fr: o.name, en: o.name } })),
  }));
  async function saveSettings(values: Record<string, SettingValue>): Promise<boolean> {
    const r = await postJson('/api/device/settings', { device_id: a.boitierId, slug: a.slug, values }, s.saveError, ignoreBody);
    return r.ok;
  }
  const reading = (c: ControlDecl): string => {
    const v = a.values[c.id];
    if (v === undefined) return s.unknownValue;
    const unit = 'unit' in c && c.unit ? ` ${c.unit}` : '';
    return typeof v === 'boolean' ? (v ? s.on : s.off) : `${v}${unit}`;
  };
  const alerting = (c: ControlDecl): boolean => {
    const v = num(a.values[c.id]);
    return c.kind === CONTROL.reading && v !== null && ((c.alertBelow !== undefined && v < c.alertBelow) || (c.alertAbove !== undefined && v > c.alertAbove));
  };
</script>

<DeviceFrame {lang} name={a.name} boxId={a.boitierId} boxName={boitierName} online={a.online} {grouped} {grip}>
  {#snippet icon()}
    <IconMark icon={a.kind.icon} label={a.kind.label[lang]} />
  {/snippet}
  {#if actions.length}
    <div class="dpad" data-device={a.boitierId} data-slug={a.slug}>
      {#each actions as c (c.id)}
        <button type="button" class={{ sending: sending === c.id }} data-action={c.id} title={c.label[lang]} aria-label={c.label[lang]} disabled={!a.online}
          onclick={() => { if (c.kind === CONTROL.action && c.confirm) asking = c.id; else void send(c.id); }}>
          <!-- comme sur le boitier : le symbole, et le libelle dessous -->
          {#if c.kind === CONTROL.action && c.icon}<span class="sym"><IconMark icon={c.icon} label={c.label[lang]} /></span>{/if}<span class="lbl">{c.label[lang]}</span>
        </button>
      {/each}
    </div>
  {/if}
  {#each actions as c (c.id)}
    {#if asking === c.id && c.kind === CONTROL.action && c.confirm}
      <div class="ask" data-ask={c.id}>
        <p class="note">{c.confirm[lang]}</p>
        <button type="button" class="btn danger sm" data-confirm={c.id} onclick={() => { asking = null; void send(c.id); }}>{c.label[lang]}</button>
        <button type="button" class="btn ghost sm" onclick={() => { asking = null; }}>{s.cancel}</button>
      </div>
    {/if}
  {/each}
  {#if position}
    <!-- UNE barre, comme sur le boitier : elle montre la FERMETURE (pleine = ferme) et sa poignee ; si la
         position se regle, un curseur invisible la recouvre (clic, glisser, clavier), sans seconde barre. -->
    <div class="position">
      <div class={['gauge', { disabled: !a.online }]} style={`--p:${pos === null ? 50 : 100 - pos}`} title={pos !== null ? s.posState(pos) : undefined}>
        <span class="fill"></span><span class="handle"></span>
        {#if position.kind === CONTROL.position && position.settable}
          <input class="pos-range" type="range" min="0" max="100" step="1" value={pos === null ? 50 : 100 - pos} aria-label={position.label[lang]} data-control={position.id}
            disabled={!a.online} onchange={(e) => send(position.id, 100 - Number(e.currentTarget.value))} />
        {/if}
      </div>
      <span class="pos-label">{pos === null ? s.posUnknown : s.posState(pos)}</span>
    </div>
  {/if}
  {#each others as c (c.id)}
    {#if c.kind === CONTROL.toggle}
      <label class="ctl-toggle"><input type="checkbox" checked={a.values[c.id] === true} disabled={!a.online} data-control={c.id}
        onchange={(e) => send(c.id, e.currentTarget.checked)} /> {c.label[lang]}</label>
    {:else if c.kind === CONTROL.setpoint}
      <label class="ctl-setpoint">{c.label[lang]}
        <input type="number" min={c.min} max={c.max} step={c.step} value={num(a.values[c.id]) ?? ''} disabled={!a.online} data-control={c.id}
          onchange={(e) => send(c.id, Number(e.currentTarget.value))} /> {c.unit}</label>
    {:else}
      <div class={['ctl-reading', { alert: alerting(c) }]}><KeyValue label={c.label[lang]} value={reading(c)} /></div>
    {/if}
  {/each}
  {#snippet action()}
    <button class="gear" type="button" data-det title={s.details} aria-label={s.details} onclick={() => { showDetails = !showDetails; }}><GearIcon /></button>
  {/snippet}
  {#snippet details()}
    <div class="hw-det" hidden={!showDetails}>
      <KeyValue label={s.typeWord} value={a.kind.label[lang]} />
      {#if pos !== null}<KeyValue label={s.posWord} value={`${pos} %`} />{/if}
      {#if a.rssiDbm != null}<KeyValue label={s.wifiSignal} value={s.radioState(a.rssiDbm)} />{/if}
      {#if !a.online}<KeyValue label={s.state} value={s.offline} />{/if}
      {#if settingsFields.length}
        <div class="dev-settings" data-settings={a.slug}>
          <SettingsForm fields={settingsFields} values={a.settings} {lang} onSave={saveSettings} idPrefix={`set-${a.boitierId}-${a.slug}`} />
        </div>
      {/if}
      <!-- code que Google exige pour ouvrir CET appareil : le sien, ou a defaut celui du compte -->
      {#if a.googlePinSet !== undefined}
        <div class="dev-pin" data-google-pin={a.slug}>
          <GooglePinField {lang} label={s.googlePinTitle} status={a.googlePinSet ? `✓ ${s.googlePinOwnNote}` : s.googlePinDefaultNote} pinSet={a.googlePinSet} appliance={a.id} idSuffix={`${a.boitierId}-${a.slug}`} />
        </div>
      {/if}
    </div>
  {/snippet}
</DeviceFrame>

<style>
  .ask { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .6rem; }
  .ask .note { flex-basis: 100%; margin: 0; }
  .pos-range { position: absolute; inset: 0; width: 100%; height: 100%; margin: 0; opacity: 0; cursor: pointer; }
  .pos-range:disabled { cursor: not-allowed; }
  .gauge:has(.pos-range:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  .ctl-toggle, .ctl-setpoint { display: flex; gap: 0.5rem; align-items: center; }
  .ctl-setpoint input { width: 5rem; }
  .ctl-reading.alert { color: var(--danger); }
  /* l'ecran de reglages partage, aux couleurs du portail */
  /* le code Google : un bloc a part sous les reglages, separe par un trait */
  .dev-pin { margin-top: .75rem; border-top: 1px solid var(--border); }
  .dev-settings { margin-top: 0.75rem; --oph-border: var(--border); --oph-input: var(--bg-elev); --oph-muted: var(--text-muted); --oph-danger: var(--danger); --oph-accent: var(--accent); }
</style>
