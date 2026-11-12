<script lang="ts">
  // Mot de passe oublie (demande d'un lien) et choix du mot de passe (depuis un lien signe).
  import { t, ROUTES, type Lang } from '../../lib/i18n.ts';
  import { postJson, ignoreBody } from '../../lib/api.ts';
  import { PASSWORD_MODE, type PasswordMode } from '../../lib/password-view.ts';

  interface Props { lang: Lang; mode: PasswordMode; token: string; minLength: number; }
  const { lang, mode, token, minLength }: Props = $props();
  const s = $derived(t(lang));

  let email = $state('');
  let pw = $state('');
  let pw2 = $state('');
  let busy = $state(false);
  let done = $state(false);
  let error = $state<string | null>(null);

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    busy = true; error = null;
    if (mode === PASSWORD_MODE.forgot) {
      // reponse constante cote serveur : on annonce l'envoi dans tous les cas
      const r = await postJson('/api/password/forgot', { email: email.trim(), lang }, s.netErr, ignoreBody);
      if (r.ok) done = true; else busy = false;
      return;
    }
    if (pw !== pw2) { error = s.passwordMismatch; busy = false; return; }
    const r = await postJson('/api/password/set', { token, password: pw }, s.netErr, ignoreBody);
    if (r.ok) { location.href = `${ROUTES.connexion[lang]}?local=1&ok=password`; return; }
    error = r.error; busy = false;
  }
</script>

{#if mode === PASSWORD_MODE.forgot}
  <form class="login-box" id="pwForm" data-mode="forgot" onsubmit={submit}>
    <h1>{s.forgotTitle}</h1>
    <p class="note">{s.forgotIntro}</p>
    <label for="em">{s.signInUser}</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="em" type="email" autocomplete="username" autofocus required bind:value={email} />
    <p class="note" id="pwDone" hidden={!done}>{s.forgotSent}</p>
    <button type="submit" disabled={busy}>{s.forgotBtn}</button>
    <a class="login-link" href={`${ROUTES.connexion[lang]}?local=1`}>{s.backToLogin}</a>
  </form>
{:else}
  <form class="login-box" id="pwForm" data-mode="set" onsubmit={submit}>
    <h1>{s.setPasswordTitle}</h1>
    <label for="pw">{s.newPassword}</label>
    <!-- svelte-ignore a11y_autofocus -->
    <input id="pw" type="password" autocomplete="new-password" minlength={minLength} autofocus required bind:value={pw} />
    <label for="pw2">{s.confirmPassword}</label>
    <input id="pw2" type="password" autocomplete="new-password" minlength={minLength} required bind:value={pw2} />
    <p class="err" id="pwErr" hidden={error === null}>{error}</p>
    <button type="submit" disabled={busy}>{s.setPasswordBtn}</button>
  </form>
{/if}
