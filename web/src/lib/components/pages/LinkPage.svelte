<script lang="ts">
  // Liaison d'un appareil (device grant, cote utilisateur) : saisir un code, confirmer l'appareil
  // trouve, ou code invalide/expire.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import LinkConfirm from '#lib/components/screens/LinkConfirm.svelte';
  import LinkCodeForm from '#lib/components/LinkCodeForm.svelte';
  import { t, ROUTES, otherLang } from '#lib/i18n.ts';
  import { LINK_VIEW } from '#lib/link.ts';
  import type { LinkData } from '#lib/screen-data.ts';
  const { data }: { data: LinkData } = $props();
  const s = $derived(t(data.lang));
</script>

<CloudLayout title={s.linkTitle} lang={data.lang} altUrl={ROUTES.lier[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.linkTitle}</h1></div>
  {#if data.view === LINK_VIEW.confirm}
    <LinkConfirm lang={data.lang} code={data.code} deviceId={data.deviceId} />
  {:else}
    <p class="lead">{s.linkLead}</p>
    {#if data.view === LINK_VIEW.invalid}<p class="formerr" style="margin:0 0 .8rem">{s.linkInvalid}</p>{/if}
    <div class="panel"><LinkCodeForm lang={data.lang} value={data.view === LINK_VIEW.invalid ? data.code : ''} /></div>
  {/if}
</CloudLayout>
