<script lang="ts">
  // Connexion locale : e-mail et mot de passe, captcha s'il est active, puis le code de double
  // authentification si le compte l'a activee. Vrais formulaires : marche sans JavaScript.
  import BareLayout from '#lib/components/layout/BareLayout.svelte';
  import AuthShell from '#lib/components/layout/AuthShell.svelte';
  import { t, ROUTES } from '#lib/i18n.ts';
  import { LOGIN_ERROR, LOGIN_STEP, type LoginError } from '#lib/login.ts';
  import type { LoginData } from '#lib/screen-data.ts';
  const { data }: { data: LoginData } = $props();
  const s = $derived(t(data.lang));
  const ERR = $derived({
    [LOGIN_ERROR.bad]: s.signInError, [LOGIN_ERROR.captcha]: s.loginCaptchaError, [LOGIN_ERROR.locked]: s.loginLocked,
    [LOGIN_ERROR.totp]: s.loginTotpError, [LOGIN_ERROR.expired]: s.loginExpired,
  } satisfies Record<LoginError, string>);
</script>

<BareLayout title={s.signInTitle} lang={data.lang} portalName={data.shell.portalName} theme={data.shell.theme} app={data.shell.app}>
  <AuthShell shell={data.shell}>
    {#if data.none}
      <div class="login-box"><p class="note">{s.noLoginMethod}</p></div>
    {:else if data.step === LOGIN_STEP.totp}
      <form class="login-box" method="post" action="/api/login/totp">
        <h1>{s.signInTitle}</h1>
        <input type="hidden" name="lang" value={data.lang} />
        {#if data.error}<p class="err" role="alert">{ERR[data.error]}</p>{/if}
        <p class="note">{s.loginTotpPrompt}</p>
        <label for="c">{s.totpCodeLabel}</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input id="c" class="code" name="code" type="text" inputmode="numeric" pattern="[0-9 ]{'{'}6,7{'}'}" maxlength="7" autocomplete="one-time-code" autofocus required />
        <button type="submit">{s.signInBtn}</button>
      </form>
    {:else}
      <form class="login-box" method="post" action="/api/login">
        <h1>{s.signInTitle}</h1>
        <input type="hidden" name="lang" value={data.lang} />
        {#if data.info && !data.error}<p class="ok" role="status">{s.passwordSetOk}</p>{/if}
        {#if data.error}<p class="err" role="alert">{ERR[data.error]}</p>{/if}
        <label for="u">{s.signInUser}</label>
        <!-- svelte-ignore a11y_autofocus -->
        <input id="u" name="user" type="email" autocomplete="username" autofocus required />
        <label for="p">{s.signInPass}</label>
        <input id="p" name="pass" type="password" autocomplete="current-password" required />
        {#if data.captcha}
          <label for="cap">{s.loginCaptchaLabel}</label>
          <!-- SVG du captcha fabrique par notre serveur (jamais une donnee saisie) -->
          <div class="login-captcha">{@html data.captcha.svg}
            <input id="cap" class="code" name="captcha" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="5" required />
          </div>
          <input type="hidden" name="captcha_token" value={data.captcha.token} />
        {/if}
        <button type="submit">{s.signInBtn}</button>
        {#if data.forgot}<a class="login-link" href={ROUTES.oubli[data.lang]}>{s.forgotLink}</a>{/if}
      </form>
    {/if}
  </AuthShell>
</BareLayout>
