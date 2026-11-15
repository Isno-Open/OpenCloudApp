<script lang="ts">
  // Fiche d'un compte pour l'operateur : le compte, puis chaque boitier en detail. LECTURE SEULE, et
  // seulement ce qui sert au support (RGPD : voir AdminBoxDetail, users-view.ts).
  import CloudLayout from '#lib/components/layout/CloudLayout.svelte';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import { t, ROUTES, userHref, otherLang } from '#lib/i18n.ts';
  import { relativeTime } from '#lib/time.ts';
  import type { UserDetailData } from '#lib/screen-data.ts';
  const { data }: { data: UserDetailData } = $props();
  const s = $derived(t(data.lang));
  const a = $derived(data.account);
  const KIB = 1024;
  const when = (ms: number | null): string => (ms === null ? s.udUnknown : `${new Date(ms).toLocaleString(data.lang)} (${relativeTime(ms, data.now, data.lang)})`);
  // appareils sans nom montre (telecommandes) : un compte par type, pas une ligne chacun
  const unnamed = (apps: UserDetailData['boxes'][number]['appliances']): { label: string; n: number }[] => {
    const out: { label: string; n: number }[] = [];
    for (const d of apps) if (!d.name) {
      const label = d.kind ? d.kind[data.lang] : '?';
      const g = out.find((x) => x.label === label);
      if (g) g.n++; else out.push({ label, n: 1 });
    }
    return out;
  };
</script>

<CloudLayout title={a.name} lang={data.lang} altUrl={userHref(a.id, otherLang(data.lang))} shell={data.shell}>
  <a class="back" href={ROUTES.utilisateurs[data.lang]}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"></path></svg> {s.backUsers}</a>
  <div class="page-head"><h1>{a.name}</h1>{#if a.isSelf}<span class="pill">{s.youTag}</span>{/if}</div>
  <p class="hint" data-privacy>{s.udPrivacy}</p>

  <div class="panel" data-user-account>
    <h3>{s.udAccount}</h3>
    <KeyValue label={s.udEmail} value={a.id} />
    {#if a.source}<KeyValue label={s.udSource} value={a.source} />{/if}
    <KeyValue label={s.udRole} value={a.admin ? s.roleAdmin : s.roleUser} />
    <KeyValue label={s.colCap} value={String(a.cap)} />
    <KeyValue label={s.ud2fa} value={a.totpEnabled ? s.udYes : s.udNo} />
    {#if a.locked}<KeyValue label={s.udLocked} value={s.udYes} />{/if}
    {#if a.invited}<KeyValue label={s.udRole} value={s.invitedTag} />{/if}
    <KeyValue label={s.udCreated} value={when(a.createdAt)} />
    <KeyValue label={s.udActive} value={when(a.lastActiveAt)} />
  </div>

  <div class="panel" data-user-hardware>
    <h3>{s.udHardware}</h3>
    {#if !data.hardware.length}<p class="note">{s.udNoHardware}</p>{/if}
    {#each data.hardware as h, i (i)}
      <div class="ud-app"><strong>{h.label}</strong><span class="mono">× {h.quantity}</span><span class="mono">{h.sku}</span>
        <span>{s.udInvoice(h.invoice, new Date(h.date).toLocaleDateString(data.lang))}</span><span class="role">{h.status}</span></div>
    {/each}
  </div>

  <h2 class="ud-h">{s.udBoxes} ({data.boxes.length})</h2>
  {#if !data.boxes.length}<p class="note">{s.udNoBox}</p>{/if}
  {#each data.boxes as b (b.id)}
    <section class="panel ud-box" data-user-box={b.id}>
      <div class="ab-head">
        <span class={['dot', { off: !b.online }]}></span><strong>{b.name}</strong>{#if b.name !== b.id}<span class="mono">{b.id}</span>{/if}
        <span class="role">{b.family ? b.family[data.lang] : s.boxFamilyMissing}</span>
        {#if b.updateAvailable}<span class="role pending">{s.updAvail}</span>{/if}
        {#if b.trial}<span class="role pending">{s.fleetTrial}</span>{/if}
      </div>
      <div class="ud-grid">
        <div>
          <KeyValue label={s.state} value={s.presence(b.online, b.cloudDisabled)} />
          <KeyValue label={s.cloudMode} value={s.cloudModeValue(b.online, b.cloudDisabled)} />
          <KeyValue label={s.udLastSeen} value={when(b.lastSeenAt)} />
          <KeyValue label={s.udPaired} value={when(b.pairedAt)} />
          <KeyValue label={s.localBroker} value={b.localBroker ? s.udYes : s.udNo} />
        </div>
        <div>
          {#if b.board}<KeyValue label={s.udBoard} value={`${b.board} (${s.udBoardHint})`} />{/if}
          <KeyValue label={s.firmware} value={b.firmware + (b.trial ? ` · ${s.onTrial}` : '')} />
          {#if b.latest}<KeyValue label={s.udLatest} value={b.latest} />{/if}
          {#if b.previous}<KeyValue label={s.previousVersion} value={b.previous} />{/if}
          {#if b.rssiDbm !== null}<KeyValue label={s.wifiSignal} value={`${b.rssiDbm} dBm`} />{/if}
          {#if b.freeHeap !== null && b.minFreeHeap !== null}<KeyValue label={s.memory} value={s.memoryValue(b.freeHeap, b.minFreeHeap)} />{:else if b.minFreeHeap !== null}<KeyValue label={s.memory} value={s.boxMinHeap(Math.round(b.minFreeHeap / KIB))} />{/if}
          {#if b.uptimeS !== null}<KeyValue label={s.since} value={s.uptimeValue(b.uptimeS)} />{/if}
          {#if b.lastReset}<KeyValue label={s.boxReset} value={b.lastReset[data.lang]} />{/if}
        </div>
      </div>
      <h4>{s.udAppliances} ({b.appliances.length})</h4>
      <div class="ud-apps">
        {#each unnamed(b.appliances) as g (g.label)}<div class="ud-app"><span class="role">{g.label}</span><span class="mono">× {g.n}</span></div>{/each}
        {#each b.appliances.filter((x) => x.name) as d, i (i)}
          <div class="ud-app"><span>{d.name}</span><span class="role">{d.kind ? d.kind[data.lang] : '?'}</span>
            {#if d.position !== null}<span class="mono">{s.udPosition(d.position)}</span>{/if}
            {#each d.settings as st (st.label.fr)}<span class="mono">{st.label[data.lang]} : {st.value}</span>{/each}
          </div>
        {/each}
      </div>
      <h4>{s.udEvents}</h4>
      {#if !b.events.length}<p class="note">{s.udNoEvents}</p>{/if}
      {#each b.events as e, i (i)}
        <div class={['ud-ev', { alert: e.alert }]}><span class="mono">{when(e.at)}</span> {e.text[data.lang]}</div>
      {/each}
    </section>
  {/each}
</CloudLayout>

<style>
  .ud-h { margin: 1.2rem 0 .6rem; font-size: 1.05rem; }
  .ud-box { margin-bottom: .9rem; }
  .ud-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: 0 1.4rem; }
  .ud-box h4 { margin: .9rem 0 .4rem; font-size: .85rem; color: var(--text-muted); }
  .ud-apps { display: grid; gap: .3rem; }
  .ud-app { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; font-size: .88rem; min-width: 0; }
  .ud-ev { font-size: .85rem; padding: .15rem 0; }
  .ud-ev.alert { color: var(--danger); }
  /* pas d'en-tete de compte cache : un e-mail long se coupe au lieu d'elargir la page */
  :global(.ud-box .mono) { overflow-wrap: anywhere; }
</style>
