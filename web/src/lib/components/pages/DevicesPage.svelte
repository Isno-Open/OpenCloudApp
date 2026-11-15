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
  import { flip } from 'svelte/animate';
  import { invalidateAll } from '$app/navigation';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { Appareil } from '#lib/types.ts';

  // Ordre affiche pendant et juste apres un glisser (par boitier : ses slugs), avant que le boitier
  // n'ait republie le sien ; sinon l'ordre du serveur.
  let localOrder = $state<Record<string, readonly string[]>>({});
  const coversOf = (id: string): Appareil[] => {
    const base = data.appareils.filter((a) => a.boitierId === id), o = localOrder[id];
    return o ? [...base].sort((a, b) => o.indexOf(a.slug) - o.indexOf(b.slug)) : base;
  };

  // Glisser une carte par sa poignee (souris et doigt : evenements de pointeur). La carte suit l'ordre
  // en direct ; au lacher, le nouveau rang part au boitier, qui decale les autres et republie.
  const REFRESH_MS = 1500;     // le temps que le boitier applique et republie l'ordre
  const EDGE_PX = 64, SCROLL_PX = 12;   // defilement automatique pres du bord de l'ecran
  let drag = $state<{ box: string; slug: string; from: number } | null>(null);
  let dragError = $state<string | null>(null);
  function startDrag(box: string, slug: string, e: PointerEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.setPointerCapture(e.pointerId);
    const slugs = coversOf(box).map((a) => a.slug);
    localOrder[box] = slugs;
    drag = { box, slug, from: slugs.indexOf(slug) };
    dragError = null;
  }
  function moveDrag(e: PointerEvent): void {
    const d = drag;
    if (!d) return;
    if (e.clientY < EDGE_PX) window.scrollBy(0, -SCROLL_PX); else if (e.clientY > window.innerHeight - EDGE_PX) window.scrollBy(0, SCROLL_PX);
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('[data-drag-slug]');
    const target = over?.dataset.dragSlug;
    if (!over || over.dataset.dragBox !== d.box || !target || target === d.slug) return;
    const list = [...(localOrder[d.box] ?? [])], at = list.indexOf(target);
    list.splice(list.indexOf(d.slug), 1);
    list.splice(at, 0, d.slug);
    localOrder[d.box] = list;
  }
  async function endDrag(): Promise<void> {
    const d = drag;
    drag = null;
    if (!d) return;
    const to = (localOrder[d.box] ?? []).indexOf(d.slug);
    if (to === d.from) { delete localOrder[d.box]; return; }
    const r = await postJson('/api/device/rank', { device_id: d.box, slug: d.slug, rank: to + 1 }, s.reorderError, ignoreBody);
    if (!r.ok) { dragError = s.reorderError; delete localOrder[d.box]; return; }
    setTimeout(async () => { await invalidateAll(); delete localOrder[d.box]; }, REFRESH_MS);
  }
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
      {#if dragError}<p class="note error" role="alert">{dragError}</p>{/if}
      {#if covers.length}
        <div class="hw-grid">
          {#each covers as a (a.id)}
            {@const movable = b.reorderable && covers.length > 1}
            <div class={['drag-item', { dragging: drag?.box === b.id && drag.slug === a.slug }]} data-drag-box={b.id} data-drag-slug={a.slug} animate:flip={{ duration: 160 }}>
              {#snippet grip()}{#if movable}<button type="button" class="grip" title={s.dragHandle} aria-label={s.dragHandle}
                onpointerdown={(e) => startDrag(b.id, a.slug, e)} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag}>⠿</button>{/if}{/snippet}
              {#if isKnownAppareil(a)}<DeviceCard appareil={a} siblings={covers} boitierName={b.name} lang={data.lang} grouped {grip} />
              {:else}<UnknownDeviceCard appareil={a} boitierName={b.name} lang={data.lang} grouped {grip} />{/if}
            </div>
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
