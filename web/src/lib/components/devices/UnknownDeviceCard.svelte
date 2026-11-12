<script lang="ts">
  // Appareil dont aucun plugin ne declare le type : montre (le boitier l'a publie), sans commandes.
  import { t, type Lang } from '#lib/i18n.ts';
  import type { Appareil } from '#lib/types.ts';
  import DeviceFrame from './DeviceFrame.svelte';
  interface Props { appareil: Appareil; boitierName: string; lang: Lang; grouped?: boolean; }
  const { appareil: a, boitierName, lang, grouped = false }: Props = $props();
  const s = $derived(t(lang));
</script>

<DeviceFrame {lang} name={a.name} boxId={a.boitierId} boxName={boitierName} online={a.online} {grouped} unknown>
  {#snippet icon()}<span aria-hidden="true">?</span>{/snippet}
  <p class="note unknown-note"><strong>{s.unknownDevice}</strong><br />{a.declaredType ? s.unknownDeclared(a.declaredType) : s.unknownNoType}</p>
</DeviceFrame>
