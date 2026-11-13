<script lang="ts">
  // Sous-onglets d'un ecran : libelles en texte, filet vertical entre deux, trait d'accent sous l'actif.
  // Meme forme partout (Plugins, Utilisateurs, Parametres) : seuls les onglets passes changent.
  // `current` suit l'ancre de l'adresse ; rendu serveur : le premier onglet.
  import { onMount } from 'svelte';
  import { tabFromHash, type SubTab } from './subtabs.ts';
  interface Props { label: string; items: readonly SubTab[]; current: string; }
  let { label, items, current = $bindable() }: Props = $props();
  onMount(() => {
    const follow = (): void => { current = tabFromHash(items, location.hash); };
    follow();
    addEventListener('hashchange', follow);
    return () => removeEventListener('hashchange', follow);
  });
</script>

<nav class="subtabs" aria-label={label}>
  {#each items as it, i (it.id)}
    {#if i > 0}<span class="subtab-sep" aria-hidden="true"></span>{/if}
    <a class={['subtab', { active: current === it.id }]} href={`#${it.id}`} aria-current={current === it.id ? 'page' : undefined} data-tab={it.id}>
      {it.label}{#if it.count !== undefined}<span class="count">{it.count}</span>{/if}{#if it.alert}<span class="subtab-alert" title={it.alert}></span>{/if}
    </a>
  {/each}
</nav>
