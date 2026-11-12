<script lang="ts">
  // Ecran operateur : plugins. Installes (reglages par l'ecrou, retrait), catalogue (integres et
  // sources), sources ajoutees. Rendu d'abord par le serveur (memes donnees, meme balisage), puis
  // anime ici. Activer, retirer, installer ou mettre a jour redemarre le portail.
  import GearIcon from '#lib/components/ui/GearIcon.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, pluginHref, type Lang } from '#lib/i18n.ts';
  import { postJson, getJson, ignoreBody, field, reloadAfterRestart, type Parse } from '#lib/api.ts';
  import type { InstalledRow, CatalogEntry, SourceRow } from '#lib/plugins-view.ts';

  interface Props {
    lang: Lang;
    installed: InstalledRow[];
    entries: CatalogEntry[];
    sources: SourceRow[];
    catalogError: string | null;
  }
  const { lang, installed, entries, sources, catalogError }: Props = $props();
  const s = $derived(t(lang));

  const INSTALL_POLL_MS = 700;
  const API = {
    enable: '/api/plugins/enable', disable: '/api/plugins/disable', install: '/api/plugins/install',
    status: '/api/plugins/status', sources: '/api/plugins/sources',
  } as const;

  type InstallStatus = { busy: boolean; progress: number; error: string | null };
  const parseStatus: Parse<InstallStatus> = (b) => {
    const busy = field(b, 'busy'), progress = field(b, 'progress'), error = field(b, 'error');
    if (typeof busy !== 'boolean') return null;
    return { busy, progress: typeof progress === 'number' ? progress : 0, error: typeof error === 'string' ? error : null };
  };

  let busy = $state(false);
  let error = $state<string | null>(null);
  let message = $state('');
  let progress = $state<Record<string, number>>({});
  let sourceUrl = $state('');
  let sourceError = $state<string | null>(null);

  function fail(m: string): void { error = m; busy = false; message = ''; }

  async function act(url: string, id: string): Promise<void> {
    busy = true; error = null;
    const r = await postJson(url, { id }, s.saveError, ignoreBody);
    if (!r.ok) { fail(r.error); return; }
    message = s.pluginRestarting;
    reloadAfterRestart();
  }

  async function install(id: string): Promise<void> {
    busy = true; error = null; message = s.pluginInstalling; progress[id] = 0;
    const r = await postJson(API.install, { id }, s.saveError, ignoreBody);
    if (!r.ok) { fail(r.error); return; }
    // suivi de la copie, puis activation (qui redemarre le portail)
    for (;;) {
      const st = await getJson(`${API.status}?id=${encodeURIComponent(id)}`, s.saveError, parseStatus);
      if (!st.ok) { fail(st.error); return; }
      progress[id] = st.data.progress;
      if (st.data.error) { fail(st.data.error); return; }
      if (!st.data.busy) break;
      await new Promise((done) => setTimeout(done, INSTALL_POLL_MS));
    }
    await act(API.enable, id);
  }

  async function changeSources(body: { add: string } | { remove: string }): Promise<void> {
    sourceError = null;
    const r = await postJson(API.sources, body, s.saveError, ignoreBody);
    if (r.ok) location.reload(); else sourceError = r.error;
  }
</script>

<div class="panel">
  <h3>{s.pluginsInstalled}</h3>
  {#if installed.length === 0}<p class="hint" style="margin:0">{s.pluginsNoneInstalled}</p>{/if}
  {#each installed as p (p.id)}
    <div class="plugin-row">
      <div class="plugin-main">
        <span class="k">{p.title} <span class="ro">{p.builtin ? s.pluginBuiltin : s.pluginExternal}</span></span>
        {#if p.description}<span class="hint">{p.description[lang]}</span>{/if}
      </div>
      <div class="plugin-act">
        {#if p.configurable}
          <a class="gear" href={pluginHref(p.id, lang)} title={s.pluginSettings} aria-label={`${s.pluginSettings} : ${p.title}`}>
            <GearIcon strokeWidth={1.8} />
          </a>
        {/if}
        {#if p.enabled}
          <button class="btn ghost sm" type="button" data-disable={p.id} disabled={busy} onclick={() => act(API.disable, p.id)}>{p.builtin ? s.pluginDisable : s.pluginRemove}</button>
        {/if}
      </div>
    </div>
  {/each}
</div>

<div class="panel" style="margin-top:.9rem">
  <h3>{s.pluginsCatalogTitle}</h3>
  {#if catalogError !== null}<p class="formerr" style="margin:0 0 .5rem">{s.pluginsCatalogDown} ({catalogError})</p>{/if}
  {#each entries as p (p.id)}
    <div class="plugin-row">
      <div class="plugin-main"><span class="k">{p.title} <span class="ro">{p.origin}</span>{#if p.version}<span class="ro">{p.version}</span>{/if}</span>{#if p.description}<span class="hint">{p.description[lang]}</span>{/if}
        {#if !p.builtin}<div class="bar" hidden={progress[p.id] === undefined} data-bar={p.id}><span style={`width:${progress[p.id] ?? 0}%`}></span></div>{/if}</div>
      <div class="plugin-act">
        {#if p.enabled && p.updateAvailable}
          <button class="btn primary sm" type="button" data-install={p.id} disabled={busy} onclick={() => install(p.id)}>{s.pluginUpdate(p.installedVersion ?? '?', p.version ?? '?')}</button>
        {:else if p.enabled}
          <span class="tag-ok">✓ {s.pluginIsInstalled}</span>
        {:else if p.builtin}
          <button class="btn primary sm" type="button" data-enable={p.id} disabled={busy} onclick={() => act(API.enable, p.id)}>{s.pluginEnable}</button>
        {:else}
          <button class="btn primary sm" type="button" data-install={p.id} disabled={busy} onclick={() => install(p.id)}>{s.pluginInstall}</button>
        {/if}
      </div>
    </div>
  {/each}
  <ErrorText error={error} id="pluginsErr" />
  <p class="savemsg" id="pluginsMsg">{message}</p>
</div>

<form class="panel" id="sourcesForm" style="margin-top:.9rem" onsubmit={(e) => { e.preventDefault(); void changeSources({ add: sourceUrl.trim() }); }}>
  <h3>{s.pluginSourcesTitle}</h3>
  <div class="plugin-row"><div class="plugin-main"><span class="k">{s.pluginCatalog}</span><span class="hint">{s.pluginSourceIsno}</span></div></div>
  {#each sources as src (src.url)}
    <div class="plugin-row">
      <div class="plugin-main"><span class="k mono">{src.url}</span>{#if src.error}<span class="formerr" style="margin:0">{src.error}</span>{/if}</div>
      <div class="plugin-act"><button class="btn ghost sm" type="button" data-source-remove={src.url} onclick={() => changeSources({ remove: src.url })}>{s.pluginSourceRemove}</button></div>
    </div>
  {/each}
  <Field label={s.pluginSourceAdd} forId="srcUrl" hint={s.pluginSourceWarn}>
    <div class="row"><input id="srcUrl" type="url" spellcheck="false" placeholder="https://exemple.fr/plugins.json" style="flex:1" bind:value={sourceUrl} /><button class="btn ghost" type="submit">{s.pluginSourceAddBtn}</button></div>
  </Field>
  <ErrorText error={sourceError} id="srcErr" />
</form>
