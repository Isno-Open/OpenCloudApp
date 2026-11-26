<script lang="ts">
  // Ecran Compte : le code PIN du COMPTE, que Google exige pour ouvrir un portail. Il vaut pour tous les
  // portails ; le code propre d'un portail, qui le remplace pour lui seul, se regle sur la carte du portail.
  import GooglePinField from './GooglePinField.svelte';
  import { t, type Lang } from '#lib/i18n.ts';

  interface Props { lang: Lang; pinSet: boolean; }
  const { lang, pinSet }: Props = $props();
  const s = $derived(t(lang));
</script>

<div class="panel" id="googlePinPanel" style="margin-top:.9rem">
  <h3>{s.googlePinTitle}</h3>
  <p class="note">{s.googlePinIntro}</p>
  <GooglePinField {lang} label={s.googlePinAccountLabel} status={pinSet ? `✓ ${s.googlePinOnNote}` : s.googlePinOffNote} {pinSet} appliance={null} idSuffix="account" />
  <p class="note" style="margin-top:.9rem">{s.googlePinGatesIntro}</p>
</div>
