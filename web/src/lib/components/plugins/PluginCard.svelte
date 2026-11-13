<script lang="ts">
  // Carte d'un plugin. Meme cadre pour tous : marque, nom et origine, ecrou, description, puis en bas
  // l'etat et l'action. Seul le contenu change d'une carte a l'autre ; le pied est colle en bas, les
  // cartes d'une meme rangee ont donc leurs actions alignees.
  import GearIcon from '#lib/components/ui/GearIcon.svelte';
  import IconMark from '#lib/components/ui/IconMark.svelte';
  import { t, pluginHref, type Lang } from '#lib/i18n.ts';
  import { PLUGIN_STATE, PLUGIN_ACTION, type PluginCardData, type PluginAction } from '#lib/plugins-view.ts';

  interface Props { lang: Lang; card: PluginCardData; busy: boolean; progress: number | undefined; onaction: (a: PluginAction, id: string) => void; }
  const { lang, card, busy, progress, onaction }: Props = $props();
  const s = $derived(t(lang));
  const on = $derived(card.state !== PLUGIN_STATE.available);
  const mark = $derived(card.title.trim().charAt(0).toUpperCase());
</script>

<article class={['plugin-card', { on }]} data-plugin={card.id} data-state={card.state}>
  <header class="plugin-card-head">
    <span class="plugin-mark">{#if card.icon}<IconMark icon={card.icon} label={card.title} />{:else}<span aria-hidden="true">{mark}</span>{/if}</span>
    <div class="plugin-card-title">
      <h3>{card.title}</h3>
      <div class="plugin-tags"><span class="ro">{card.origin}</span>{#if card.version}<span class="ro">{card.version}</span>{/if}</div>
    </div>
    {#if card.configurable}
      <a class="gear" href={pluginHref(card.id, lang)} title={s.pluginSettings} aria-label={`${s.pluginSettings} : ${card.title}`}><GearIcon strokeWidth={1.8} /></a>
    {/if}
  </header>
  {#if card.description}<p class="plugin-desc">{card.description[lang]}</p>{/if}
  {#if !card.builtin}<div class="bar" hidden={progress === undefined} data-bar={card.id}><span style={`width:${progress ?? 0}%`}></span></div>{/if}
  <!-- pied : l'etat a gauche (theme en cours, actif), les actions a droite ; chaque cas garde toutes
       ses actions (mise a jour comprise, meme pour un plugin qui apporte un theme) -->
  <footer class="plugin-card-foot">
    {#if card.theme?.inUse}
      <span class="plugin-status on" data-theme-in-use={card.theme.id}>{s.themeInUse(card.theme.label)}</span>
    {:else if card.theme}
      <span class="plugin-status">{card.theme.label}</span>
    {:else if on}
      <span class="plugin-status on">{s.pluginActiveTag}</span>
    {:else}
      <span class="plugin-status"></span>
    {/if}
    <span class="plugin-card-act">
      {#if on && card.updateAvailable}
        <button class="btn primary sm" type="button" data-install={card.id} disabled={busy} onclick={() => onaction(PLUGIN_ACTION.install, card.id)}>{s.pluginUpdate(card.installedVersion ?? '?', card.version ?? '?')}</button>
      {/if}
      {#if card.theme && !card.theme.inUse}
        <button class="btn primary sm" type="button" data-use-theme={card.theme.id} disabled={busy} onclick={() => onaction(PLUGIN_ACTION.useTheme, card.id)}>{s.themeUse}</button>
      {/if}
      {#if card.state === PLUGIN_STATE.active}
        <button class="btn ghost sm" type="button" data-disable={card.id} disabled={busy} onclick={() => onaction(PLUGIN_ACTION.disable, card.id)}>{card.builtin ? s.pluginDisable : s.pluginRemove}</button>
      {:else if card.state === PLUGIN_STATE.available && card.builtin}
        <button class="btn primary sm" type="button" data-enable={card.id} disabled={busy} onclick={() => onaction(PLUGIN_ACTION.enable, card.id)}>{s.pluginEnable}</button>
      {:else if card.state === PLUGIN_STATE.available}
        <button class="btn primary sm" type="button" data-install={card.id} disabled={busy} onclick={() => onaction(PLUGIN_ACTION.install, card.id)}>{s.pluginInstall}</button>
      {/if}
    </span>
  </footer>
</article>
