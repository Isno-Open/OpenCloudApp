<script lang="ts">
  // Ecran operateur : plugins, en cartes. Actifs d'abord (reglages par l'ecrou, retrait, mise a jour),
  // puis ceux qu'on peut ajouter (integres et catalogues), enfin les sources du catalogue. Rendu d'abord par le serveur (memes donnees, meme balisage), puis
  // anime ici. Activer, retirer, installer ou mettre a jour redemarre le portail.
  import SubTabs from '#lib/components/ui/SubTabs.svelte';
  import PluginCard from '#lib/components/plugins/PluginCard.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, getJson, ignoreBody, field, reloadAfterRestart, type Parse } from '#lib/api.ts';
  import { PLUGIN_STATE, PLUGIN_ACTION, type PluginCardData, type PluginAction, type SourceRow } from '#lib/plugins-view.ts';
  import { PLUGIN_CATEGORY, EXCLUSIVE_CATEGORIES, type PluginCategory } from '@opencloudapp/core/plugin-contract.js';

  interface Props {
    lang: Lang;
    cards: PluginCardData[];
    sources: SourceRow[];
    catalogError: string | null;
  }
  const { lang, cards, sources, catalogError }: Props = $props();
  // une section par categorie, dans un ordre fixe ; actifs d'abord dans chacune ; categorie vide : pas de section
  const ORDER: readonly PluginCategory[] = [PLUGIN_CATEGORY.login, PLUGIN_CATEGORY.appearance, PLUGIN_CATEGORY.devices, PLUGIN_CATEGORY.app, PLUGIN_CATEGORY.other];
  const rank = (c: PluginCardData): number => (c.state === PLUGIN_STATE.available ? 1 : 0);
  const sections = $derived(ORDER.map((cat) => ({ cat, cards: cards.filter((c) => c.category === cat).sort((a, b) => rank(a) - rank(b)) })).filter((x) => x.cards.length > 0));
  const s = $derived(t(lang));

  const INSTALL_POLL_MS = 700;
  const API = {
    enable: '/api/plugins/enable', disable: '/api/plugins/disable', install: '/api/plugins/install',
    status: '/api/plugins/status', sources: '/api/plugins/sources', theme: '/api/settings/general',
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

  // deux onglets : les plugins, et les sources du catalogue (a part : on y vient rarement)
  const TAB = { plugins: 'plugins', sources: 'sources' } as const;
  let tab = $state<string>(TAB.plugins);
  const sourcesFaulty = $derived(catalogError !== null || sources.some((x) => !!x.error));

  // theme en cours : un reglage, pas un redemarrage
  async function useTheme(id: string): Promise<void> {
    const themeId = cards.find((c) => c.id === id)?.theme?.id;
    if (!themeId) return;
    busy = true; error = null;
    const r = await postJson(API.theme, { theme: themeId }, s.saveError, ignoreBody);
    if (r.ok) location.reload(); else fail(r.error);
  }

  function onaction(a: PluginAction, id: string): void {
    if (a === PLUGIN_ACTION.useTheme) void useTheme(id);
    else if (a === PLUGIN_ACTION.install) void install(id);
    else void act(a === PLUGIN_ACTION.enable ? API.enable : API.disable, id);
  }

  async function changeSources(body: { add: string } | { remove: string }): Promise<void> {
    sourceError = null;
    const r = await postJson(API.sources, body, s.saveError, ignoreBody);
    if (r.ok) location.reload(); else sourceError = r.error;
  }
</script>

<SubTabs label={s.pluginsTitle} bind:current={tab} items={[
  { id: TAB.plugins, label: s.pluginsTitle, count: cards.length },
  { id: TAB.sources, label: s.pluginSourcesTab, count: sources.length + 1, alert: sourcesFaulty ? s.pluginSourcesFaulty : undefined },
]} />

<div hidden={tab !== TAB.plugins} data-panel={TAB.plugins}>
{#if catalogError !== null}<p class="formerr">{s.pluginsCatalogDown} ({catalogError})</p>{/if}
{#each sections as sec (sec.cat)}
  <section class="plugin-section" data-category={sec.cat}>
    <h2>{s.pluginCategory[sec.cat]} <span class="count">{sec.cards.length}</span></h2>
    {#if EXCLUSIVE_CATEGORIES.includes(sec.cat)}<p class="hint plugin-section-hint">{s.pluginCategoryExclusive}</p>{/if}
    {#if sec.cat === PLUGIN_CATEGORY.appearance}<p class="hint plugin-section-hint">{s.pluginCategoryAppearance}</p>{/if}
    <div class="plugin-grid">
      {#each sec.cards as c (c.id)}<PluginCard {lang} card={c} {busy} progress={progress[c.id]} {onaction} />{/each}
    </div>
  </section>
{/each}
<ErrorText error={error} id="pluginsErr" />
<p class="savemsg" id="pluginsMsg">{message}</p>
</div>

<div hidden={tab !== TAB.sources} data-panel={TAB.sources}>
<p class="lead">{s.pluginSourcesLead}</p>
<form class="panel" id="sourcesForm" onsubmit={(e) => { e.preventDefault(); void changeSources({ add: sourceUrl.trim() }); }}>
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
</div>
