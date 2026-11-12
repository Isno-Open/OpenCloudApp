<script lang="ts">
  // Saisie du code montre par le boitier. Meme forme partout (accueil vide, Ajouter, /lier) ; il renvoie
  // vers /lier qui affiche l'appareil et demande confirmation.
  import { t, ROUTES, type Lang } from '#lib/i18n.ts';
  const { lang, value = '' }: { lang: Lang; value?: string } = $props();
  const s = $derived(t(lang));
</script>

<form class="linkcode" method="get" action={ROUTES.lier[lang]}>
  <label for="linkcode-input">{s.linkCodeLabel}</label>
  <div class="linkcode-row">
    <input id="linkcode-input" name="code" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="characters"
      spellcheck="false" maxlength="12" placeholder={s.linkCodePh} {value} required />
    <button class="btn primary" type="submit">{s.linkContinue}</button>
  </div>
</form>
