<script lang="ts">
  // Parametres > Instance : adresse du portail, enregistree seulement si les verifications passent ;
  // la liste des verifications est montree dans les deux cas.
  import { t, type Lang } from '../../lib/i18n.ts';
  import { postJson, field, type Parse } from '../../lib/api.ts';

  interface Props { lang: Lang; host: string; }
  const props: Props = $props();
  const s = $derived(t(props.lang));

  type Check = { ok: boolean; detail: string };
  const checksOf = (b: unknown): Check[] => {
    const c = field(b, 'checks');
    if (!Array.isArray(c)) return [];
    return c.flatMap((x: unknown) => {
      const ok = field(x, 'ok'), detail = field(x, 'detail');
      return typeof ok === 'boolean' && typeof detail === 'string' ? [{ ok, detail }] : [];
    });
  };
  const parseChecks: Parse<Check[]> = (b) => checksOf(b);

  // idle : rien montre ; pending : verification en cours ; done : verifications, puis issue
  type View = { state: 'idle' } | { state: 'pending' } | { state: 'done'; checks: Check[]; saved: boolean; error: string | null };
  // valeur initiale prise une fois depuis le serveur, puis editee ici
  const initialHost = (): string => props.host;
  let host = $state(initialHost());
  let view = $state<View>({ state: 'idle' });

  async function submit(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    view = { state: 'pending' };
    const r = await postJson('/api/settings/portal-host', { host: host.trim() }, s.saveError, parseChecks);
    if (r.ok) { view = { state: 'done', checks: r.data, saved: true, error: null }; return; }
    const checks = checksOf(r.body);
    view = { state: 'done', checks, saved: false, error: checks.length ? null : r.error };
  }
</script>

<form id="hostForm" onsubmit={submit}>
  <div class="field"><label for="appHost">{s.portalHostLabel}</label>
    <div class="row"><input id="appHost" type="text" spellcheck="false" bind:value={host} style="flex:1" /><button class="btn ghost" type="submit">{s.portalHostBtn}</button></div>
    <span class="hint">{s.portalHostHint}</span>
  </div>
  {#if view.state === 'pending'}
    <ul class="checks" id="hostChecks"><li>…</li></ul>
  {:else if view.state === 'done'}
    <ul class="checks" id="hostChecks">
      {#each view.checks as c, i (i)}<li class={c.ok ? 'ok' : 'ko'}>{c.ok ? '✓' : '✗'} {c.detail}</li>{/each}
      {#if view.saved}<li class="ok">{s.savedMsg}</li>{/if}
      {#if view.error !== null}<li class="ko">{view.error}</li>{/if}
    </ul>
  {/if}
</form>
