<script lang="ts">
  // Ecran Compte : les codes PIN que Google exige pour ouvrir un portail. Le code du compte vaut pour
  // tous les portails ; un portail peut avoir le sien, qui le remplace pour lui seul.
  import GooglePinField from './GooglePinField.svelte';
  import { t, type Lang } from '#lib/i18n.ts';

  interface Props { lang: Lang; pinSet: boolean; gates: readonly { id: string; name: string; pinSet: boolean }[]; }
  const { lang, pinSet, gates }: Props = $props();
  const s = $derived(t(lang));
</script>

<div class="panel" id="googlePinPanel" style="margin-top:.9rem">
  <h3>{s.googlePinTitle}</h3>
  <p class="note">{s.googlePinIntro}</p>
  <GooglePinField {lang} label={s.googlePinAccountLabel} status={pinSet ? `✓ ${s.googlePinOnNote}` : s.googlePinOffNote} {pinSet} appliance={null} idSuffix="account" />
  {#if gates.length}
    <h4 style="margin:1.1rem 0 .2rem">{s.googlePinGatesTitle}</h4>
    <p class="note">{s.googlePinGatesIntro}</p>
    {#each gates as g, i (g.id)}
      <GooglePinField {lang} label={g.name} status={g.pinSet ? `✓ ${s.googlePinOwnNote}` : s.googlePinDefaultNote} pinSet={g.pinSet} appliance={g.id} idSuffix={`gate-${i}`} />
    {/each}
  {/if}
</div>
