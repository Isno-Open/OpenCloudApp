<script lang="ts">
  // Ecran operateur : comptes locaux. Creer un utilisateur (invitation si la messagerie est en place),
  // changer son role, debloquer, reinitialiser sa double authentification, renvoyer l'invitation,
  // supprimer (confirmation dans la page, au second clic). Et le parc : resume en tete, boitiers de
  // chaque compte en lecture seule (etat, version, sante, alertes), depliables.
  import ConfirmButton from '#lib/components/ui/ConfirmButton.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import SubTabs from '#lib/components/ui/SubTabs.svelte';
  import { pageWithoutTab } from '#lib/components/ui/subtabs.ts';
  import { t, userHref, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { UserRow, FleetSummary } from '#lib/users-view.ts';
  import KeyValue from '#lib/components/ui/KeyValue.svelte';
  import { relativeTime } from '#lib/time.ts';

  // canCreate : le mode de connexion cree ses comptes dans le portail (mot de passe) ; sinon ils
  // viennent d'une source (site externe) et l'onglet de creation n'existe pas
  interface Props { lang: Lang; rows: UserRow[]; summary: FleetSummary; now: number; minPass: number; canInvite: boolean; canCreate: boolean; }
  const { lang, rows, summary, now, minPass, canInvite, canCreate }: Props = $props();
  const s = $derived(t(lang));
  const day = (ms: number): string => new Date(ms).toLocaleDateString(lang);
  const ago = (ms: number): string => relativeTime(ms, now, lang);
  const KIB = 1024;
  // comptes dont les boitiers sont deplies
  let open = $state<string[]>([]);
  const toggle = (id: string): void => { open = open.includes(id) ? open.filter((x) => x !== id) : [...open, id]; };

  const DEFAULT_CAP = 5;
  const BAD_GATEWAY = 502;   // compte cree mais invitation non partie : on recharge pour le montrer
  const RELOAD_AFTER_PARTIAL_MS = 2500;

  // deux onglets : la liste, et la creation (a part, pour que la liste vienne d'abord)
  const TAB = { list: 'list', create: 'new' } as const;
  let tab = $state<string>(TAB.list);

  let nu = $state({ email: '', name: '', password: '', cap: DEFAULT_CAP, admin: false });
  let createError = $state<string | null>(null);
  let rowError = $state<string | null>(null);
  let busyId = $state<string | null>(null);

  async function create(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    createError = null;
    const r = await postJson('/api/user/new', {
      email: nu.email.trim(), name: nu.name.trim(), password: nu.password, cap: Number(nu.cap) || DEFAULT_CAP, admin: nu.admin, lang,
    }, s.createUserError, ignoreBody);
    if (r.ok) { location.assign(pageWithoutTab()); return; }   // retour a la liste, qui le montre
    createError = r.error;
    if (r.status === BAD_GATEWAY) setTimeout(() => location.reload(), RELOAD_AFTER_PARTIAL_MS);
  }

  async function act(url: string, body: Record<string, unknown>, id: string, fallback: string): Promise<void> {
    busyId = id; rowError = null;
    const r = await postJson(url, { ...body, lang }, fallback, ignoreBody);
    if (r.ok) location.reload(); else { rowError = r.error; busyId = null; }
  }
  async function remove(id: string): Promise<void> {
    await act('/api/user/delete', { id }, id, s.removeUserError);
  }
</script>

<SubTabs label={s.usersTitle} bind:current={tab} items={[
  { id: TAB.list, label: s.usersListTitle, count: rows.length },
  ...(canCreate ? [{ id: TAB.create, label: s.userNewTitle }] : []),
]} />

{#if canCreate}
<div class="tab-panel" hidden={tab !== TAB.create} data-panel={TAB.create}>
<form class="panel" id="userForm" onsubmit={create}>
  <h3>{s.userNewTitle}</h3>
  <div class="form-grid">
    <Field label={s.userLogin} forId="u-email"><input id="u-email" name="email" type="email" autocomplete="off" spellcheck="false" required bind:value={nu.email} /></Field>
    <Field label={s.userName} forId="u-name"><input id="u-name" name="name" type="text" autocomplete="off" maxlength="80" required bind:value={nu.name} /></Field>
    <Field label={s.userPassword} forId="u-pass" hint={canInvite ? s.userPassInviteHint : undefined}><input id="u-pass" name="password" type="password" autocomplete="new-password" minlength={minPass} required={!canInvite} bind:value={nu.password} /></Field>
    <Field label={s.userCap} forId="u-cap"><input id="u-cap" name="cap" type="number" min="1" required bind:value={nu.cap} /></Field>
  </div>
  <label class="check"><input type="checkbox" id="u-admin" name="admin" bind:checked={nu.admin} /> {s.userMakeAdmin}</label>
  <div class="row end" style="margin-top:.7rem"><button class="btn primary" type="submit">{s.createUserBtn}</button></div>
  <ErrorText error={createError} id="userErr" />
</form>
</div>
{/if}

<div class="tab-panel panel" hidden={tab !== TAB.list} data-panel={TAB.list}>
  {#if !canCreate}<p class="hint" style="margin:0 0 .6rem">{s.usersFromSource}</p>{/if}
  <ErrorText error={rowError} />
  <div class="fleet" data-fleet>
    <span><strong>{summary.accounts}</strong> {s.fleetAccounts(summary.accounts)}</span>
    <span><strong>{summary.boxes}</strong> {s.fleetBoxes(summary.boxes)}</span>
    <span><strong data-fleet-online>{summary.online}</strong> {s.fleetOnline}</span>
    {#if summary.cloudDisabled}<span><strong>{summary.cloudDisabled}</strong> {s.fleetCloudOff}</span>{/if}
    {#if summary.updates}<span><strong>{summary.updates}</strong> {s.fleetUpdates}</span>{/if}
    {#if summary.trial}<span><strong>{summary.trial}</strong> {s.fleetTrial}</span>{/if}
  </div>
  <div class="utable">
    <div class="ut-head"><span>{s.colLogin}</span><span>{s.colRole}</span><span>{s.colCap}</span><span>{s.colDevices}</span><span></span></div>
    {#each rows as a (a.id)}
      <div class="ut-row">
        <span class="who"><a href={userHref(a.id, lang)} data-user-link={a.id}><b>{a.name}</b></a>{#if a.isSelf}<span class="youtag">{s.youTag}</span>{/if}<span class="mono">{a.id}</span>
          <span class="seen" data-activity={a.id}>{#if a.createdAt !== null}{s.createdOn(day(a.createdAt))} · {/if}{a.lastActiveAt !== null ? s.activeAgo(ago(a.lastActiveAt)) : s.neverActive}</span></span>
        <span class="tags">
          <span class={['role', { op: a.admin }]}>{a.admin ? s.roleAdmin : s.roleUser}</span>
          {#if a.totpEnabled}<span class="role">2FA</span>{/if}
          {#if a.locked}<span class="role locked">{s.lockedTag}</span>{/if}
          {#if a.invited}<span class="role pending">{s.invitedTag}</span>{/if}
          {#if a.source}<span class="role" data-source={a.source}>{a.source}</span>{/if}
          {#if a.missing}<span class="role locked" data-missing={a.id} title={s.missingHint}>{s.missingTag(a.source ?? '')}</span>{/if}
        </span>
        <span class="num" data-label={s.colCap}>{a.cap}</span>
        <span class="num" data-label={s.colDevices}>
          {#if a.boxes.length}<button type="button" class="btn ghost sm" data-boxes={a.id} aria-expanded={open.includes(a.id)} onclick={() => toggle(a.id)}>{s.boxesToggle(a.boxes.length)}</button>{:else}0{/if}
        </span>
        <span class="ut-act">
          {#if a.invited && canInvite}<button class="btn ghost sm" type="button" data-invite={a.id} disabled={busyId === a.id} onclick={() => act('/api/user/invite-resend', { id: a.id }, a.id, s.roleError)}>{s.resendInviteBtn}</button>{/if}
          {#if a.locked}<button class="btn ghost sm" type="button" data-unlock={a.id} disabled={busyId === a.id} onclick={() => act('/api/user/unlock', { id: a.id }, a.id, s.roleError)}>{s.unlockBtn}</button>{/if}
          {#if a.totpEnabled && !a.isSelf}<button class="btn ghost sm" type="button" data-totp-reset={a.id} disabled={busyId === a.id} onclick={() => act('/api/user/totp-reset', { id: a.id }, a.id, s.roleError)}>{s.totpResetBtn}</button>{/if}
          {#if a.canChange}
            <button class="btn ghost sm" type="button" data-role={a.id} data-admin={a.admin ? 'false' : 'true'} disabled={busyId === a.id} onclick={() => act('/api/user/role', { id: a.id, admin: !a.admin }, a.id, s.roleError)}>{a.admin ? s.unmakeAdmin : s.makeAdmin}</button>
            <ConfirmButton data-del={a.id} disabled={busyId === a.id} label={s.removeUser} confirmLabel={s.confirmRemoveUser(a.id)} onconfirm={() => remove(a.id)} />
          {/if}
        </span>
      </div>
      {#if open.includes(a.id)}
        <div class="ut-boxes" data-boxes-of={a.id}>
          {#each a.boxes as b (b.id)}
            <div class="admin-box" data-admin-box={b.id}>
              <div class="ab-head">
                <span class={['dot', { off: !b.online }]}></span><strong>{b.name}</strong>{#if b.name !== b.id}<span class="mono">{b.id}</span>{/if}
                <span class="role">{b.family ? b.family[lang] : s.boxFamilyMissing}</span>
                <span class="role mono">{b.firmware}</span>
                {#if b.updateAvailable}<span class="role pending">{s.updAvail}</span>{/if}
                {#if b.trial}<span class="role pending">{s.fleetTrial}</span>{/if}
              </div>
              <KeyValue label={s.state} value={s.presence(b.online, b.cloudDisabled) + (!b.online && b.lastSeenAt !== null ? ` · ${s.boxSeen(ago(b.lastSeenAt))}` : '')} />
              <KeyValue label={s.colDevices} value={s.boxDevices(b.devices) + (b.pairedAt !== null ? ` · ${s.boxPaired(day(b.pairedAt))}` : '')} />
              {#if b.rssiDbm !== null}<KeyValue label={s.wifiSignal} value={`${b.rssiDbm} dBm`} />{/if}
              {#if b.minFreeHeap !== null}<KeyValue label={s.memory} value={s.boxMinHeap(Math.round(b.minFreeHeap / KIB))} />{/if}
              {#if b.uptimeS !== null}<KeyValue label={s.since} value={s.uptimeValue(b.uptimeS)} />{/if}
              {#if b.lastReset}<KeyValue label={s.boxReset} value={b.lastReset[lang]} />{/if}
              {#if b.alerts.length}<KeyValue label={s.boxAlerts} value={b.alerts.map((x) => `${x.text[lang]} (${ago(x.at)})`).join(' · ')} />{/if}
            </div>
          {/each}
          <p class="hint">{s.boxesReadonly}</p>
        </div>
      {/if}
    {/each}
  </div>
</div>
