<script lang="ts">
  // Ecran de reglages d'un plugin : le cadre est le meme pour tous, seul le contenu varie, et il vient
  // de ce que le plugin DECLARE (champs, bornes, libelles). Un bouton Enregistrer, unique.
  import { SAVE, type SaveState } from '#lib/components/ui/save.ts';
  import Button from '#lib/components/ui/Button.svelte';
  import SaveMessage from '#lib/components/ui/SaveMessage.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import { onMount } from 'svelte';
  import { invalidateAll } from '$app/navigation';
  import { SETTING_KIND, TEXT_FORMAT, IMAGE_TYPES, IMAGE_MAX_CHARS, ICON_MIN_PX, type SettingField, type SettingValue } from '@opencloudapp/core/plugin-contract.js';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';

  interface Props { lang: Lang; pluginId: string; fields: readonly SettingField[]; values: Record<string, SettingValue>; }
  const { lang, pluginId, fields, values }: Props = $props();
  const s = $derived(t(lang));

  // valeurs editables (le secret n'en fait pas partie : montre, jamais renvoye)
  const initial = (): Record<string, SettingValue> => ({ ...values });
  let form = $state(initial());
  let status = $state<SaveState>(SAVE.idle);
  let revealed = $state<Record<string, boolean>>({});
  let copied = $state<Record<string, boolean>>({});
  const id = (f: SettingField): string => `pf-${f.key}`;

  // un champ « sous » une case n'est actif que si la case est cochee
  const blocked = (f: SettingField): boolean => !!f.under && form[f.under] !== true;

  async function save(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    status = SAVE.pending;
    const out: Record<string, SettingValue> = {};
    for (const f of fields) {
      if (f.kind === SETTING_KIND.secret) continue;
      const v = form[f.key];
      if (v !== undefined) out[f.key] = f.kind === SETTING_KIND.number ? Number(v) : v;
    }
    const r = await postJson('/api/settings/plugin', { id: pluginId, values: out }, s.saveError, ignoreBody);
    status = r.ok ? SAVE.ok : SAVE.err;
    if (r.ok) await invalidateAll();   // un reglage peut changer le gabarit (theme) : relu sans recharger
  }

  // couleur non reglee : le selecteur montre l'accent en vigueur, sans l'enregistrer
  let shownColor = $state<Record<string, string>>({});
  onMount(() => {
    const current = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
    for (const f of fields) if (f.kind === SETTING_KIND.color) shownColor[f.key] = String(form[f.key] || current);
  });

  // image : lue dans le navigateur en data: URL, verifiee comme le fera le serveur (type, taille, et
  // pour une icone : carree et assez grande)
  let imageError = $state<Record<string, boolean>>({});
  const isImageType = (t: string): boolean => IMAGE_TYPES.some((x) => x === t);
  const readDataUrl = (file: File): Promise<string> => new Promise((done, fail) => {
    const r = new FileReader();
    r.onload = () => { if (typeof r.result === 'string') done(r.result); else fail(new Error('lecture')); };
    r.onerror = () => fail(r.error ?? new Error('lecture'));
    r.readAsDataURL(file);
  });
  const imageSize = (src: string): Promise<{ w: number; h: number }> => new Promise((done, fail) => {
    const img = new Image();
    img.onload = () => done({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => fail(new Error('image'));
    img.src = src;
  });
  async function pickImage(f: SettingField & { kind: typeof SETTING_KIND.image }, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    imageError[f.key] = false;
    try {
      if (!isImageType(file.type)) throw new Error('type');
      const src = await readDataUrl(file);
      if (src.length > IMAGE_MAX_CHARS) throw new Error('taille');
      if (f.square && file.type !== 'image/svg+xml') {
        const { w, h } = await imageSize(src);
        if (w !== h || w < ICON_MIN_PX) throw new Error('forme');
      }
      form[f.key] = src;
    } catch { imageError[f.key] = true; }
  }

  async function copy(f: SettingField): Promise<void> {
    try { await navigator.clipboard.writeText(String(form[f.key] ?? '')); copied[f.key] = true; }
    catch { revealed[f.key] = true; }
  }
</script>

<form class="panel plugin-form" id="pluginForm" data-plugin={pluginId} onsubmit={save}>
  {#each fields as f (f.key)}
    <div class={['pf', { under: !!f.under }]} data-under={f.under}>
      {#if f.kind === SETTING_KIND.toggle}
        <label class="check"><input type="checkbox" id={id(f)} data-key={f.key} data-kind={f.kind} disabled={blocked(f)}
          checked={form[f.key] === true} onchange={(e) => { form[f.key] = e.currentTarget.checked; }} /> {f.label[lang]}</label>
      {:else if f.kind === SETTING_KIND.number}
        <Field label={f.label[lang]} forId={id(f)} hint={f.hint?.[lang]}><input id={id(f)} data-key={f.key} data-kind={f.kind} type="number" min={f.min} max={f.max}
          disabled={blocked(f)} value={String(form[f.key] ?? '')} oninput={(e) => { form[f.key] = e.currentTarget.value; }} /></Field>
      {:else if f.kind === SETTING_KIND.choice}
        <Field label={f.label[lang]} forId={id(f)} hint={f.hint?.[lang]}>
          <select id={id(f)} data-key={f.key} data-kind={f.kind} disabled={blocked(f)} onchange={(e) => { form[f.key] = e.currentTarget.value; }}>
            {#each f.options as o (o.value)}<option value={o.value} selected={o.value === form[f.key]}>{o.label[lang]}</option>{/each}
          </select>
        </Field>
      {:else if f.kind === SETTING_KIND.text}
        <Field label={f.label[lang]} forId={id(f)} hint={f.hint?.[lang]}><input id={id(f)} data-key={f.key} data-kind={f.kind}
          type={f.format === TEXT_FORMAT.url ? 'url' : 'text'} maxlength={f.maxLength} placeholder={f.placeholder} spellcheck="false" disabled={blocked(f)}
          value={String(form[f.key] ?? '')} oninput={(e) => { form[f.key] = e.currentTarget.value; }} /></Field>
      {:else if f.kind === SETTING_KIND.secret}
        <Field label={f.label[lang]} forId={id(f)} hint={f.hint?.[lang]}>
          <div class="row"><input id={id(f)} data-secret type={revealed[f.key] ? 'text' : 'password'} readonly spellcheck="false" style="flex:1" value={String(form[f.key] ?? '')} />
            <button class="btn ghost sm" type="button" data-reveal={id(f)} onclick={() => { revealed[f.key] = !revealed[f.key]; }}>{revealed[f.key] ? s.secretHide : s.secretShow}</button>
            <button class="btn ghost sm" type="button" data-copy={id(f)} onclick={() => copy(f)}>{copied[f.key] ? s.secretCopied : s.secretCopy}</button></div>
        </Field>
      {:else if f.kind === SETTING_KIND.color}
        <Field label={f.label[lang]} forId={id(f)} hint={f.hint?.[lang]}>
          <div class="row"><input id={id(f)} data-key={f.key} data-kind={f.kind} type="color" class="color" disabled={blocked(f)}
            value={String(form[f.key] || shownColor[f.key] || '')} oninput={(e) => { form[f.key] = e.currentTarget.value; }} />
            <code class="color-val">{form[f.key] || s.colorDefault}</code>
            {#if form[f.key]}<button class="btn ghost sm" type="button" data-reset={id(f)} onclick={() => { form[f.key] = ''; }}>{s.imageRemove}</button>{/if}</div>
        </Field>
      {:else if f.kind === SETTING_KIND.image}
        <Field label={f.label[lang]} forId={id(f)} hint={f.hint?.[lang]}>
          <div class="row image-pick">
            {#if form[f.key]}<img class={['preview', { square: !!f.square }]} src={String(form[f.key])} alt="" />{:else}<span class="hint">{s.imageNone}</span>{/if}
            <label class="btn ghost sm">{form[f.key] ? s.imageReplace : s.imageChoose}<input id={id(f)} data-key={f.key} data-kind={f.kind} type="file"
              accept={IMAGE_TYPES.join(',')} hidden disabled={blocked(f)} onchange={(e) => pickImage(f, e.currentTarget)} /></label>
            {#if form[f.key]}<button class="btn ghost sm" type="button" data-remove={id(f)} onclick={() => { form[f.key] = ''; }}>{s.imageRemove}</button>{/if}
          </div>
          {#if imageError[f.key]}<span class="formerr" data-image-error={f.key}>{s.imageRefused}</span>{/if}
        </Field>
      {/if}
      {#if f.kind === SETTING_KIND.toggle && f.hint}<span class="hint">{f.hint[lang]}</span>{/if}
    </div>
  {/each}
  <div class="row end" style="margin-top:.6rem">
    <SaveMessage state={status} id="pluginMsg" text={status === SAVE.ok ? s.savedMsg : status === SAVE.err ? s.saveError : ''} />
    <Button type="submit" disabled={status === SAVE.pending}>{s.saveBtn}</Button>
  </div>
</form>
