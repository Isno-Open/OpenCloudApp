<script lang="ts">
  // Ecran de consentement : « Autoriser Google Home a piloter vos volets/portails ? ». Textes bilingues
  // en local (page isolee, atteinte depuis l'app Google Home), gabarit sans barre comme la connexion.
  import BareLayout from '#lib/components/layout/BareLayout.svelte';
  import { ROUTES, LANG, type Lang } from '#lib/i18n.ts';
  import type { PageProps } from './$types';
  const { data }: PageProps = $props();
  const lang = $derived<Lang>(data.lang === LANG.en ? LANG.en : LANG.fr);

  const T = {
    fr: {
      title: 'Lier Google Home',
      ask: (acc: string) => `Autoriser Google Home à voir et piloter les volets et portails du compte ${acc} ?`,
      note: 'Vous pourrez retirer cet accès à tout moment depuis l’app Google Home.',
      allow: 'Autoriser', deny: 'Refuser',
      needLogin: 'Connectez-vous à votre compte ISNO dans ce navigateur, puis relancez la liaison depuis l’app Google Home.',
      login: 'Se connecter',
    },
    en: {
      title: 'Link Google Home',
      ask: (acc: string) => `Allow Google Home to see and control the shutters and gates of account ${acc}?`,
      note: 'You can remove this access at any time from the Google Home app.',
      allow: 'Allow', deny: 'Deny',
      needLogin: 'Sign in to your ISNO account in this browser, then start the linking again from the Google Home app.',
      login: 'Sign in',
    },
  };
  const tt = $derived(lang === LANG.en ? T.en : T.fr);
</script>

<BareLayout title={tt.title} lang={data.lang} portalName={data.shell.portalName} theme={data.shell.theme} app={data.shell.app}>
  <section class="gh-consent">
    <h1>{tt.title}</h1>
    {#if data.account}
      <p class="ask">{tt.ask(data.account)}</p>
      <p class="note">{tt.note}</p>
      <div class="row">
        <form method="POST" action="?/deny">
          <input type="hidden" name="redirect_uri" value={data.redirectUri} />
          <input type="hidden" name="state" value={data.state} />
          <button type="submit" class="ghost">{tt.deny}</button>
        </form>
        <form method="POST" action="?/allow">
          <input type="hidden" name="redirect_uri" value={data.redirectUri} />
          <input type="hidden" name="state" value={data.state} />
          <button type="submit" class="primary">{tt.allow}</button>
        </form>
      </div>
    {:else}
      <p class="ask">{tt.needLogin}</p>
      <a class="primary" href={ROUTES.connexion[lang]}>{tt.login}</a>
    {/if}
  </section>
</BareLayout>

<style>
  .gh-consent { max-width: 26rem; margin: 2rem auto; display: flex; flex-direction: column; gap: 1rem; }
  .gh-consent h1 { font-size: 1.3rem; margin: 0; }
  .ask { font-size: 1rem; line-height: 1.5; }
  .note { font-size: .85rem; color: var(--text-muted); margin: 0; }
  .row { display: flex; gap: .8rem; justify-content: flex-end; }
  .row form { margin: 0; }
  button, a.primary { font: inherit; padding: .6rem 1.2rem; border-radius: 10px; cursor: pointer; border: 1px solid var(--border); text-decoration: none; display: inline-block; }
  .primary { background: var(--accent); color: #fff; border-color: var(--accent); }
  .ghost { background: transparent; color: var(--text); }
</style>
