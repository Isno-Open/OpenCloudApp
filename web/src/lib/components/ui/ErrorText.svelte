<script lang="ts">
  // Message d'erreur d'un formulaire : cache tant qu'il n'y a pas d'erreur.
  interface Props { error: string | null; id?: string; }
  const { error, id }: Props = $props();
</script>

<p class="formerr" {id} hidden={error === null}>{error}</p>
