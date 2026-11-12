<script lang="ts">
  // Ecran operateur : comptes locaux. Creer un utilisateur (invitation si la messagerie est en place),
  // changer son role, debloquer, reinitialiser sa double authentification, renvoyer l'invitation,
  // supprimer (confirmation dans la page, au second clic).
  import ConfirmButton from '#lib/components/ui/ConfirmButton.svelte';
  import Field from '#lib/components/ui/Field.svelte';
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody } from '#lib/api.ts';
  import type { UserRow } from '#lib/users-view.ts';

  interface Props { lang: Lang; rows: UserRow[]; minPass: number; canInvite: boolean; }
  const { lang, rows, minPass, canInvite }: Props = $props();
  const s = $derived(t(lang));

  const DEFAULT_CAP = 5;
  const BAD_GATEWAY = 502;   // compte cree mais invitation non partie : on recharge pour le montrer
  const RELOAD_AFTER_PARTIAL_MS = 2500;

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
    if (r.ok) { location.reload(); return; }
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

<form class="panel" id="userForm" style="margin-bottom:1rem" onsubmit={create}>
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

<div class="panel">
  <h3>{s.usersListTitle}</h3>
  <ErrorText error={rowError} />
  <div class="utable">
    <div class="ut-head"><span>{s.colLogin}</span><span>{s.colRole}</span><span>{s.colCap}</span><span>{s.colDevices}</span><span></span></div>
    {#each rows as a (a.id)}
      <div class="ut-row">
        <span class="who"><b>{a.name}</b>{#if a.isSelf}<span class="youtag">{s.youTag}</span>{/if}<span class="mono">{a.id}</span></span>
        <span class="tags">
          <span class={['role', { op: a.admin }]}>{a.admin ? s.roleAdmin : s.roleUser}</span>
          {#if a.totpEnabled}<span class="role">2FA</span>{/if}
          {#if a.locked}<span class="role locked">{s.lockedTag}</span>{/if}
          {#if a.invited}<span class="role pending">{s.invitedTag}</span>{/if}
        </span>
        <span class="num" data-label={s.colCap}>{a.cap}</span>
        <span class="num" data-label={s.colDevices}>{a.devices}</span>
        <span class="ut-act">
          {#if a.invited && canInvite}<button class="btn ghost sm" type="button" data-invite={a.id} disabled={busyId === a.id} onclick={() => act('/api/user/invite-resend', { id: a.id }, a.id, s.roleError)}>{s.resendInviteBtn}</button>{/if}
          {#if a.locked}<button class="btn ghost sm" type="button" data-unlock={a.id} disabled={busyId === a.id} onclick={() => act('/api/user/unlock', { id: a.id }, a.id, s.roleError)}>{s.unlockBtn}</button>{/if}
          {#if a.totpEnabled && !a.isSelf}<button class="btn ghost sm" type="button" data-totp-reset={a.id} disabled={busyId === a.id} onclick={() => act('/api/user/totp-reset', { id: a.id }, a.id, s.roleError)}>{s.totpResetBtn}</button>{/if}
          {#if a.canChange}
            <button class="btn ghost sm" type="button" data-role={a.id} data-admin={a.admin ? 'false' : 'true'} disabled={busyId === a.id} onclick={() => act('/api/user/role', { id: a.id, admin: !a.admin }, a.id, s.roleError)}>{a.admin ? s.unmakeOperator : s.makeOperator}</button>
            <ConfirmButton data-del={a.id} disabled={busyId === a.id} label={s.removeUser} confirmLabel={s.confirmRemoveUser(a.id)} onconfirm={() => remove(a.id)} />
          {/if}
        </span>
      </div>
    {/each}
  </div>
</div>
