<script lang="ts">
  // Accueil « Mes appareils » : chaque boitier en section, ses appareils dessous.
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import DeviceCard from '#lib/components/devices/DeviceCard.svelte';
  import UnknownDeviceCard from '#lib/components/devices/UnknownDeviceCard.svelte';
  import LinkCodeForm from '#lib/components/LinkCodeForm.svelte';
  import GearIcon from '#lib/components/ui/GearIcon.svelte';
  import { t, ROUTES, appareilHref, otherLang } from '#lib/i18n.ts';
  import { isKnownAppareil } from '#lib/types.ts';
  import { relativeTime } from '#lib/time.ts';
  import type { DevicesData } from '#lib/screen-data.ts';
  const { data }: { data: DevicesData } = $props();
  const s = $derived(t(data.lang));
  const coversOf = (id: string) => data.appareils.filter((a) => a.boitierId === id);
</script>

<CloudLayout title={s.appareilsTitle} lang={data.lang} altUrl={ROUTES.appareils[otherLang(data.lang)]} shell={data.shell}>
  <div class="page-head"><h1>{s.appareilsTitle}</h1></div>
  <p class="lead">{data.account.email} · {s.leadAppareils(data.boitiers.length)}</p>
  {#each data.boitiers as b (b.id)}
    {@const covers = coversOf(b.id)}
    <section class="appareil-group">
      <div class="grp-head" style={b.online ? undefined : 'opacity:.75'}>
        <span class={['dot', { off: !b.online }]}></span>
        <span class="grp-name">{b.name}</span>
        {#if !b.online && b.lastSeenAt !== null}<span class="grp-seen">{s.lastSeen(relativeTime(b.lastSeenAt, data.now, data.lang))}</span>{/if}
        {#if b.updateAvailable}<span class="pill upd">{s.updAvail}</span>{/if}
        <span class="grp-sub">{covers.length} {s.devicesWord}</span>
        <span style="flex:1"></span>
        <a class="gear" href={appareilHref(b.id, data.lang)} title={s.configure} aria-label={`${s.configure} ${b.name}`}><GearIcon /></a>
      </div>
      {#if covers.length}
        <div class="hw-grid">
          {#each covers as a (a.id)}
            {#if isKnownAppareil(a)}<DeviceCard appareil={a} boitierName={b.name} lang={data.lang} grouped />
            {:else}<UnknownDeviceCard appareil={a} boitierName={b.name} lang={data.lang} grouped />{/if}
          {/each}
        </div>
      {:else}
        <p class="empty">{s.noCovers}</p>
      {/if}
    </section>
  {:else}
    <section class="welcome">
      <h2>{s.welcomeTitle}</h2>
      <p class="note">{s.welcomeLead}</p>
      <ol class="welcome-steps"><li>{s.welcomeStep1}</li><li>{s.welcomeStep2}</li><li>{s.welcomeStep3}</li></ol>
      <LinkCodeForm lang={data.lang} />
      <p class="legacy">{s.legacyHint} <a href={ROUTES.ajouter[data.lang]}>{s.legacyLink}</a></p>
    </section>
  {/each}
</CloudLayout>
