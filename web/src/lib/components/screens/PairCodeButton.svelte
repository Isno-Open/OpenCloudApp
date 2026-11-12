<script lang="ts">
  // Ajouter > obtenir un code d'appairage a saisir dans un boitier (firmware anterieur au QR).
  import { t, type Lang } from '#lib/i18n.ts';
  import { postJson, field, type Parse } from '#lib/api.ts';

  interface Props { lang: Lang; }
  const { lang }: Props = $props();
  const s = $derived(t(lang));
  const parseCode: Parse<string> = (b) => { const c = field(b, 'code'); return typeof c === 'string' && c ? c : null; };

  let busy = $state(false);
  let text = $state<string | null>(null);

  async function getCode(): Promise<void> {
    busy = true;
    const r = await postJson('/api/device/new', {}, s.netErr, parseCode);
    text = r.ok ? s.pairCode(r.data) : r.status === null ? s.netErr : s.errPrefix(r.error);
    busy = false;
  }
</script>

<div class="add">
  <div>
    <div style="font-weight:550">{s.getCodeTitle}</div>
    <p class="note" style="margin:.15rem 0 0">{s.getCodeNote}</p>
  </div>
  <button class="btn primary" type="button" id="pairBtn" disabled={busy} onclick={getCode}>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"></path></svg>
    {s.getCodeBtn}
  </button>
</div>
<span class="code" id="pairCode" hidden={text === null}>{text}</span>
