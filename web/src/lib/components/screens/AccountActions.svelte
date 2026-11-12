<script lang="ts">
  // Ecran Compte, partie interactive : double authentification (activer, confirmer, desactiver) et
  // deconnexion (vers l'adresse de deconnexion d'un site externe s'il y en a une).
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, ignoreBody, field, type Parse } from '#lib/api.ts';

  interface Props { lang: Lang; home: string; totpOn: boolean; totpRequired: boolean; totpEnabled: boolean; }
  const { lang, home, totpOn, totpRequired, totpEnabled }: Props = $props();
  const s = $derived(t(lang));

  type Enrollment = { svg: string; secret: string };
  const parseEnrollment: Parse<Enrollment> = (b) => {
    const svg = field(b, 'svg'), secret = field(b, 'secret');
    return typeof svg === 'string' && typeof secret === 'string' ? { svg, secret } : null;
  };
  const parseLogout: Parse<{ redirect: string | null }> = (b) => {
    const r = field(b, 'redirect');
    return { redirect: typeof r === 'string' && r ? r : null };
  };

  let error = $state<string | null>(null);
  let busy = $state(false);
  let enrollment = $state<Enrollment | null>(null);
  let code = $state('');
  let offCode = $state('');

  async function start(): Promise<void> {
    busy = true; error = null;
    const r = await postJson('/api/account/totp/start', {}, s.saveError, parseEnrollment);
    busy = false;
    if (r.ok) enrollment = r.data; else error = r.error;
  }
  async function confirm(): Promise<void> {
    const r = await postJson('/api/account/totp/confirm', { code }, s.saveError, ignoreBody);
    if (r.ok) location.reload(); else error = r.error;
  }
  async function disable(): Promise<void> {
    const r = await postJson('/api/account/totp/disable', { code: offCode }, s.saveError, ignoreBody);
    if (r.ok) location.reload(); else error = r.error;
  }
  async function logout(): Promise<void> {
    const r = await postJson('/api/logout', {}, s.saveError, parseLogout);
    location.href = (r.ok && r.data.redirect) || home;
  }
  // secret lisible par groupes de 4
  const grouped = (secret: string): string => secret.replace(/(.{4})/g, '$1 ').trim();
</script>

{#if totpOn}
  <div class="panel" id="totpPanel" style="margin-top:.9rem">
    <h3>{s.totpTitle}</h3>
    {#if totpRequired && !totpEnabled}<p class="formerr" style="margin:0 0 .5rem">{s.totpRequiredNotice}</p>{/if}
    {#if totpEnabled}
      <p class="note">✓ {s.totpOnNote}</p>
      {#if !totpRequired}
        <div class="row" style="margin-top:.5rem">
          <input class="code-in" id="totpOffCode" type="text" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code" bind:value={offCode} />
          <button class="btn ghost sm" type="button" id="totpDisableBtn" onclick={disable}>{s.totpDisable}</button>
        </div>
      {/if}
    {:else}
      <p class="note">{s.totpIntro}</p>
      {#if enrollment === null}
        <button class="btn primary" type="button" id="totpStartBtn" style="margin-top:.5rem" disabled={busy} onclick={start}>{s.totpEnable}</button>
      {:else}
        <div id="totpEnroll" style="margin-top:.7rem">
          <!-- SVG du QR fabrique par notre serveur (jamais une donnee saisie) -->
          <div class="qr" id="totpQr">{@html enrollment.svg}</div>
          <p class="note">{s.totpManual} <code id="totpSecret">{grouped(enrollment.secret)}</code></p>
          <div class="row" style="margin-top:.5rem">
            <input class="code-in" id="totpCode" type="text" inputmode="numeric" maxlength="7" placeholder="123456" autocomplete="one-time-code" bind:value={code} />
            <button class="btn primary sm" type="button" id="totpConfirmBtn" onclick={confirm}>{s.totpConfirm}</button>
          </div>
        </div>
      {/if}
    {/if}
    <ErrorText error={error} id="totpErr" />
  </div>
{/if}

<div class="card" style="margin-top:.9rem">
  <div class="add">
    <div>
      <div style="font-weight:550">{s.logoutTitle}</div>
      <p class="note" style="margin:.15rem 0 0">{s.logoutNote}</p>
    </div>
    <button class="btn ghost" type="button" id="logoutBtn" onclick={logout}>{s.logoutBtn}</button>
  </div>
</div>
