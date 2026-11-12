<script lang="ts">
  // Mot de passe oublie (demande d'un lien) ou choix du mot de passe (depuis un lien signe).
  import BareLayout from '#lib/components/layout/BareLayout.svelte';
  import AuthShell from '#lib/components/layout/AuthShell.svelte';
  import PasswordForm from '#lib/components/screens/PasswordForm.svelte';
  import { t, ROUTES } from '#lib/i18n.ts';
  import { PASSWORD_MODE } from '#lib/password-view.ts';
  import type { PasswordData } from '#lib/screen-data.ts';
  const { data }: { data: PasswordData } = $props();
  const s = $derived(t(data.lang));
  const forgot = $derived(data.mode === PASSWORD_MODE.forgot);
</script>

<BareLayout title={forgot ? s.forgotTitle : s.setPasswordTitle} lang={data.lang} portalName={data.shell.portalName} theme={data.shell.theme} app={data.shell.app}>
  <AuthShell shell={data.shell}>
    {#if !forgot && !data.valid}
      <div class="login-box">
        <h1>{s.setPasswordTitle}</h1>
        <p class="err">{s.linkExpired}</p>
        <a class="login-link" href={ROUTES.oubli[data.lang]}>{s.askNewLink}</a>
      </div>
    {:else}
      <PasswordForm lang={data.lang} mode={data.mode} token={data.token} minLength={data.minLength} />
    {/if}
  </AuthShell>
</BareLayout>
