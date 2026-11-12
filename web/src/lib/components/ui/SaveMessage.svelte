<script lang="ts">
  // Message d'etat a cote d'un bouton Enregistrer : en cours, reussi, ou en echec.
  import { SAVE, type SaveState } from './save.ts';
  interface Props { state: SaveState; text: string; id?: string; }
  const { state, text, id }: Props = $props();
</script>

<span class={['savemsg', { ok: state === SAVE.ok, err: state === SAVE.err }]} {id}>{state === SAVE.pending ? '…' : text}</span>
