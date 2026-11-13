<script lang="ts">
  // Installation du portail (auto-hebergement), ouverte seulement pendant une fenetre apres le demarrage
  // du serveur. Etape 1 : base de donnees (SQLite, MongoDB fourni installe par le superviseur, MongoDB
  // externe teste). Etape 2 : socle (noms d'hote, operateur) ; le broker est prepare, les deux noms
  // verifies jusqu'a cette instance, puis la config est ecrite et le portail redemarre. Un journal garde
  // une ligne par operation.
  import ErrorText from '#lib/components/ui/ErrorText.svelte';
  import { onMount } from 'svelte';
  import { getJson, postJson, field, type Parse } from '#lib/api.ts';

  type Kinds = { sqlite: string; mongoBundled: string; mongoExternal: string };
  interface Props {
    remaining: number; windowMin: number; kinds: Kinds; checkLabels: Record<string, string>;
    userAdminLabel: string; userAdminHint: string; loginUrl: string;
  }
  const props: Props = $props();

  const TICK_MS = 1000, MODULE_POLL_MS = 1000, MODULE_MAX_TRIES = 240, CHECK_DELAY_MS = 2000;
  const RESTART_POLL_MS = 1500, RESTART_MAX_TRIES = 60, GO_DELAY_MS = 3000;
  const LINE = { run: 'run', ok: 'ok', ko: 'ko' } as const;
  type LineState = (typeof LINE)[keyof typeof LINE];
  const ICON: Record<LineState, string> = { [LINE.run]: '◌', [LINE.ok]: '✓', [LINE.ko]: '✗' };
  type Sub = { ok: boolean; text: string };
  type Line = { key: string; state: LineState; text: string; sub: Sub[] };

  // valeurs initiales, prises une fois depuis le serveur
  const initialRemaining = (): number => props.remaining;
  const initialKind = (): string => props.kinds.sqlite;
  let left = $state(initialRemaining());
  let expired = $state(initialRemaining() <= 0);
  let finished = $state(false);
  let stepN = $state<1 | 2 | 3>(1);
  let kind = $state(initialKind());
  let mongoUrl = $state('');
  let test = $state<Sub | null>(null);
  let testing = $state(false);
  let busy1 = $state(false);
  let busy2 = $state(false);
  let moduleProgress = $state<number | null>(null);
  let brokerProgress = $state<number | null>(null);
  let journal = $state<Line[]>([]);
  let formError = $state<string | null>(null);
  let f = $state({ appHost: '', brokerHost: '', adminEmail: '', adminName: '', adminPassword: '', userAdmin: true });

  const clock = $derived(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`);

  // Journal : une ligne par operation (en cours -> ok / echec), jamais effacee.
  function line(key: string, text: string, state: LineState = LINE.run): void {
    const i = journal.findIndex((l) => l.key === key);
    const prev = i >= 0 ? journal[i] : undefined;
    const next: Line = { key, state, text, sub: prev?.sub ?? [] };
    if (i >= 0) journal[i] = next; else journal.push(next);
  }
  function sub(key: string, lines: Sub[]): void {
    const l = journal.find((x) => x.key === key);
    if (l) l.sub = lines;
  }

  type Module = { ready: boolean; busy: boolean; progress: number; error: string | null };
  const parseModule: Parse<Module> = (b) => {
    const ready = field(b, 'ready'), busy = field(b, 'busy'), progress = field(b, 'progress'), error = field(b, 'error');
    return { ready: ready === true, busy: busy === true, progress: typeof progress === 'number' ? progress : 0, error: typeof error === 'string' && error ? error : null };
  };
  type Checks = { ok: boolean; checks: Sub[] };
  const toLines = (b: unknown): Sub[] => {
    const c = field(b, 'checks');
    if (!Array.isArray(c)) return [];
    return c.flatMap((x: unknown) => {
      const ok = field(x, 'ok'), check = field(x, 'check'), detail = field(x, 'detail');
      return typeof ok === 'boolean' && typeof check === 'string' && typeof detail === 'string'
        ? [{ ok, text: `${props.checkLabels[check] ?? check} : ${detail}` }] : [];
    });
  };
  const parseChecks: Parse<Checks> = (b) => ({ ok: field(b, 'ok') === true, checks: toLines(b) });
  const parseOk: Parse<{ ok: boolean; error: string | null }> = (b) => {
    const e = field(b, 'error');
    return { ok: field(b, 'ok') === true, error: typeof e === 'string' ? e : null };
  };
  const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

  /** Attend qu'un module soit pret ; la progression s'affiche dans sa ligne du journal. */
  async function waitModule(url: string, key: string, label: string, setProgress: (p: number | null) => void): Promise<void> {
    for (let tries = 1; tries <= MODULE_MAX_TRIES; tries++) {
      await sleep(MODULE_POLL_MS);
      const r = await getJson(url, 'superviseur indisponible', parseModule);
      if (!r.ok) { if (r.status === null) continue; throw new Error(r.error); }
      if (r.data.ready) { setProgress(null); return; }
      if (r.data.error && !r.data.busy) throw new Error(r.data.error);
      setProgress(r.data.progress);
      line(key, `Installation de ${label}… ${r.data.progress} %`);
    }
    throw new Error(`${label} ne démarre pas`);
  }

  const dbPayload = (): { kind: string; mongoUrl: string } => ({ kind, mongoUrl });

  async function testDb(): Promise<void> {
    testing = true; test = { ok: true, text: 'Test…' };
    const r = await postJson('/api/setup/test-db', dbPayload(), 'erreur réseau', parseOk);
    test = r.ok && r.data.ok ? { ok: true, text: '✓ connexion OK' } : { ok: false, text: `✗ ${r.ok ? (r.data.error ?? 'échec') : r.error}` };
    testing = false;
  }

  // Etape 1 : « Continuer » verifie ou installe ce qu'il faut, puis passe a la suite.
  async function next1(): Promise<void> {
    if (kind === props.kinds.sqlite) { line('db', 'Base : SQLite embarqué', LINE.ok); stepN = 2; return; }
    busy1 = true;
    try {
      if (kind === props.kinds.mongoExternal) {
        line('db', 'Test de la connexion à MongoDB externe…');
        const r = await postJson('/api/setup/test-db', dbPayload(), 'erreur réseau', parseOk);
        if (r.ok && r.data.ok) { line('db', 'Base : MongoDB externe, connexion vérifiée', LINE.ok); stepN = 2; }
        else line('db', `MongoDB externe : ${r.ok ? (r.data.error ?? 'connexion impossible') : r.error}`, LINE.ko);
        return;
      }
      // MongoDB fourni : deja installe -> on passe ; sinon installation avec progression.
      line('db', 'Vérification de MongoDB…');
      const url = `/api/setup/module?kind=${encodeURIComponent(kind)}`;
      const st = await getJson(url, 'superviseur indisponible', parseModule);
      if (!st.ok) throw new Error(st.error);
      if (!st.data.ready) {
        const inst = await postJson('/api/setup/module', { kind }, 'installation impossible', parseModule);
        if (!inst.ok) throw new Error(inst.error);
        await waitModule(url, 'db', 'MongoDB', (p) => { moduleProgress = p; });
      }
      line('db', 'Base : MongoDB installé et démarré', LINE.ok);
      stepN = 2;
    } catch (e) {
      line('db', `MongoDB : ${e instanceof Error ? e.message : String(e)}`, LINE.ko);
    } finally {
      busy1 = false;
    }
  }

  // Etape 2 : prepare le broker (certificat au nom choisi, installation), verifie les deux noms jusqu'a
  // cette instance, puis enregistre et attend le redemarrage.
  async function finish(e: SubmitEvent): Promise<void> {
    e.preventDefault();
    formError = null; busy2 = true;
    const hosts = { appHost: f.appHost.trim(), brokerHost: f.brokerHost.trim() };
    let current = 'broker';
    const fail = (msg: string): void => { line(current, msg, LINE.ko); formError = msg; busy2 = false; };
    line('broker', `Certificat du broker pour ${hosts.brokerHost}…`);
    const br = await postJson('/api/setup/broker', { brokerHost: hosts.brokerHost }, 'préparation impossible', parseModule);
    if (!br.ok) { fail(`Broker : ${br.error}`); return; }
    line('broker', `Certificat du broker émis pour ${hosts.brokerHost}`, LINE.ok);
    current = 'brokerRun';
    line('brokerRun', 'Installation du broker…');
    if (!br.data.ready) {
      try { await waitModule('/api/setup/broker', 'brokerRun', 'broker', (p) => { brokerProgress = p; }); }
      catch (x) { fail(`Broker : ${x instanceof Error ? x.message : String(x)}`); return; }
    }
    line('brokerRun', 'Broker installé et démarré', LINE.ok);
    current = 'checks';
    line('checks', 'Vérification des noms d\'hôte…');
    await sleep(CHECK_DELAY_MS);
    const ck = await postJson('/api/setup/check-hosts', hosts, 'erreur réseau', parseChecks);
    if (!ck.ok) { sub('checks', toLines(ck.body)); fail(ck.error); return; }
    sub('checks', ck.data.checks);
    if (!ck.data.ok) { fail('Un nom ne mène pas à cette instance : voir le détail.'); return; }
    line('checks', `Noms vérifiés : ${hosts.appHost} et ${hosts.brokerHost} mènent à cette instance`, LINE.ok);
    current = 'save';
    line('save', 'Enregistrement de la configuration…');
    const db = dbPayload();
    const sv = await postJson('/api/setup/save', {
      kind: db.kind, mongoUrl: db.mongoUrl, appHost: hosts.appHost, brokerHost: hosts.brokerHost,
      adminEmail: f.adminEmail.trim(), adminName: f.adminName.trim(), adminPassword: f.adminPassword, userAdmin: f.userAdmin,
    }, 'échec', parseOk);
    if (!sv.ok) { const lines = toLines(sv.body); if (lines.length) sub('checks', lines); fail(`Enregistrement : ${sv.error}`); return; }
    line('save', 'Configuration enregistrée', LINE.ok);
    finished = true; stepN = 3;
    line('restart', 'Redémarrage du portail…');
    const parseConfigured: Parse<boolean> = (b) => field(b, 'configured') === true;
    for (let tries = 1; tries <= RESTART_MAX_TRIES; tries++) {
      await sleep(RESTART_POLL_MS);
      const r = await getJson('/api/setup/status', '', parseConfigured);
      if (r.ok && r.data) {
        line('restart', 'Portail redémarré : ouverture de la connexion…', LINE.ok);
        setTimeout(() => { location.href = props.loginUrl; }, GO_DELAY_MS);
        return;
      }
    }
    line('restart', 'Le portail tarde à redémarrer : rechargez la page dans un instant.', LINE.ko);
  }

  type Defaults = { appHost: string; brokerHost: string };
  const parseDefaults: Parse<Defaults> = (b) => {
    const a = field(b, 'appHost'), m = field(b, 'brokerHost');
    return { appHost: typeof a === 'string' ? a : '', brokerHost: typeof m === 'string' ? m : '' };
  };
  onMount(() => {
    // Compte a rebours de la fenetre : a zero, on bascule sur l'ecran « delai depasse ».
    const deadline = Date.now() + left * 1000;
    const tick = setInterval(() => {
      left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      if (finished) clearInterval(tick);
      else if (left === 0) { clearInterval(tick); expired = true; }
    }, TICK_MS);
    // noms d'hote pre-remplis
    void getJson('/api/setup/defaults', '', parseDefaults).then((r) => {
      if (!r.ok) return;
      if (r.data.appHost && !f.appHost) f.appHost = r.data.appHost;
      if (r.data.brokerHost && !f.brokerHost) f.brokerHost = r.data.brokerHost;
    });
    return () => clearInterval(tick);
  });
</script>

<div class="setup">
  <div class="setup-head">
    <span class="eyebrow">// onboarding</span>
    <h1>Configuration du portail</h1>
    <p class="sub">Première installation : deux étapes, puis le portail redémarre configuré.</p>
    {#if !expired && !finished}
      <p class="window" id="windowBar">Installation ouverte encore <b id="countdown">{clock}</b>. Par sécurité, elle se ferme {props.windowMin} minutes après le démarrage du serveur.</p>
    {/if}
    {#if !expired}
      <div class="steps">
        <span class={['st', { active: stepN === 1 }]} data-dot="1">1 · Base de données</span>
        <span class={['st', { active: stepN >= 2 }]} data-dot="2">2 · Socle</span>
      </div>
    {/if}
  </div>

  {#if expired}
    <div class="setup-card expired" id="expired">
      <h3>Délai d'installation dépassé</h3>
      <p class="note">Par sécurité, l'installation n'est ouverte que pendant les {props.windowMin} minutes qui suivent le démarrage du serveur : sinon, n'importe qui trouvant ce portail en ligne pourrait le configurer à votre place.</p>
      <p class="note">Redémarrez le serveur, puis rechargez cette page :</p>
      <pre class="cmd">docker compose restart server</pre>
    </div>
  {:else}
    <form id="setupForm" class="setup-card" onsubmit={finish}>
      <section class="step" data-step="1" hidden={stepN !== 1}>
        <h3>Base de données</h3>
        <label class="opt"><input type="radio" name="kind" value={props.kinds.sqlite} bind:group={kind} onchange={() => { test = null; }} /><span><b>SQLite</b> (embarqué, recommandé). Rien à installer, un fichier sur le volume. Idéal pour un parc modeste.</span></label>
        <label class="opt"><input type="radio" name="kind" value={props.kinds.mongoBundled} bind:group={kind} onchange={() => { test = null; }} /><span><b>MongoDB fourni</b>. Installé automatiquement sur ce serveur (téléchargement de quelques centaines de Mo). Pour grandir.</span></label>
        <label class="opt"><input type="radio" name="kind" value={props.kinds.mongoExternal} bind:group={kind} onchange={() => { test = null; }} /><span><b>MongoDB externe</b>. Votre propre serveur Mongo.</span></label>
        <div class="bar" id="moduleBarWrap" hidden={moduleProgress === null}><span id="moduleBar" style={`width:${moduleProgress ?? 0}%`}></span></div>
        {#if kind === props.kinds.mongoExternal}
          <div class="field" id="mongoUrlField"><label for="mongoUrl">URL Mongo</label><input id="mongoUrl" name="mongoUrl" type="text" placeholder="mongodb://utilisateur:motdepasse@hote:27017/isno_cloud" spellcheck="false" bind:value={mongoUrl} /></div>
          <div class="testline" id="testLine"><button type="button" class="btn ghost" id="testBtn" disabled={testing} onclick={testDb}>Tester la connexion</button><span class={['testmsg', { ok: test?.ok === true && !testing, err: test?.ok === false }]} id="testMsg">{test?.text ?? ''}</span></div>
        {/if}
        <div class="row end"><button type="button" class="btn primary" data-next="1" disabled={busy1} onclick={next1}>Continuer</button></div>
      </section>

      <section class="step" data-step="2" hidden={stepN !== 2}>
        <h3>Socle</h3>
        <div class="field"><label for="appHost">Nom d'hôte du portail</label><input id="appHost" name="appHost" type="text" placeholder="cloud.exemple.fr" spellcheck="false" autocapitalize="none" required bind:value={f.appHost} /><span class="hint">L'adresse où vous êtes en ce moment.</span></div>
        <div class="field"><label for="brokerHost">Nom d'hôte du broker MQTT</label><input id="brokerHost" name="brokerHost" type="text" placeholder="mqtt.exemple.fr" spellcheck="false" autocapitalize="none" required bind:value={f.brokerHost} /><span class="hint">Le nom sous lequel les boîtiers joindront le broker : public (Internet) ou réseau local. Son certificat sera créé avec ce nom.</span></div>
        <div class="bar" id="brokerBarWrap" hidden={brokerProgress === null}><span id="brokerBar" style={`width:${brokerProgress ?? 0}%`}></span></div>
        <h3 class="sub-h">Admin du portail</h3>
        <div class="field"><label for="adminEmail">E-mail</label><input id="adminEmail" name="adminEmail" type="email" autocomplete="email" required bind:value={f.adminEmail} /><span class="hint">Votre identifiant de connexion. Vous aurez accès à Paramètres et Plugins.</span></div>
        <div class="field"><label for="adminName">Nom</label><input id="adminName" name="adminName" type="text" autocomplete="name" maxlength="80" required bind:value={f.adminName} /></div>
        <div class="field"><label for="adminPassword">Mot de passe</label><input id="adminPassword" name="adminPassword" type="password" autocomplete="new-password" minlength="8" required bind:value={f.adminPassword} /><span class="hint">8 caractères minimum.</span></div>
        <label class="check" style="margin-top:.4rem"><input type="checkbox" id="userAdmin" bind:checked={f.userAdmin} /> {props.userAdminLabel}</label>
        <span class="hint">{props.userAdminHint}</span>
        <div class="row"><button type="button" class="btn ghost" data-prev="2" onclick={() => { stepN = 1; }}>Retour</button><button type="submit" class="btn primary" id="finishBtn" disabled={busy2}>Terminer et démarrer</button></div>
        <ErrorText error={formError} id="formErr" />
      </section>

      <section class="step done" data-step="3" hidden={stepN !== 3}>
        <h3>Démarrage…</h3>
        <p class="note">Configuration enregistrée. Le portail redémarre avec la base choisie, puis cette page ouvre la connexion : identifiez-vous avec l'e-mail de l'admin.</p>
      </section>
      <!-- Journal : chaque operation sur sa ligne, conserve d'une etape a l'autre -->
      <ol class="journal" id="journal" hidden={journal.length === 0}>
        {#each journal as l (l.key)}
          <li class={l.state} data-k={l.key}><span class="ic">{ICON[l.state]}</span><span class="tx">{l.text}</span>
            {#if l.sub.length}<span class="sub">{#each l.sub as x, i (i)}<span class={x.ok ? '' : 'ko'}>{x.ok ? '✓' : '✗'} {x.text}</span>{/each}</span>{/if}
          </li>
        {/each}
      </ol>
    </form>
  {/if}
</div>

<style>
  .setup { max-width: 540px; margin: 0 auto; width: 100%; }
  .setup-head { margin-bottom: 1.1rem; }
  .setup-head .eyebrow { font-family: var(--font-mono); font-size: .78rem; letter-spacing: .12em; text-transform: uppercase; color: var(--accent2); }
  .setup-head h1 { font-family: var(--font-sans); font-weight: 800; font-size: 1.7rem; letter-spacing: -.02em; margin: .3rem 0 .2rem; }
  .setup-head .sub { color: var(--text-muted); font-size: .92rem; }
  .window { font-size: .84rem; color: var(--text-muted); margin: .7rem 0 0; }
  .window b { font-family: var(--font-mono); color: var(--accent); }
  .steps { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: .9rem; }
  .steps .st { font-family: var(--font-mono); font-size: .72rem; color: var(--text-faint); border: 1px solid var(--border); border-radius: 999px; padding: .2rem .6rem; }
  .steps .st.active { color: var(--accent); border-color: var(--accent-line); background: var(--accent-weak); }
  .setup-card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius); padding: 1.3rem; box-shadow: var(--shadow); }
  .setup-card.expired { border-color: color-mix(in srgb, var(--warn) 45%, var(--border)); }
  .step h3, .expired h3 { font-size: 1.05rem; margin: 0 0 .5rem; }
  .cmd { font-family: var(--font-mono); font-size: .85rem; background: var(--surface-2); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: .6rem .8rem; margin: .4rem 0 0; overflow-x: auto; }
  .field { display: flex; flex-direction: column; gap: .3rem; margin: .7rem 0; }
  .field label { font-size: .82rem; color: var(--text-muted); }
  .field input { font: inherit; font-size: .95rem; padding: .55rem .7rem; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--surface-2); color: var(--text); }
  .field input:focus { outline: none; border-color: var(--accent); }
  .field .hint { font-size: .76rem; color: var(--text-faint); }
  .opt { display: flex; gap: .6rem; align-items: start; padding: .6rem .7rem; border: 1px solid var(--border); border-radius: var(--radius-sm); margin: .5rem 0; cursor: pointer; font-size: .88rem; color: var(--text-muted); }
  .opt input { margin-top: .2rem; accent-color: var(--accent); }
  .opt b { color: var(--text); font-weight: 650; }
  .bar { height: 8px; border-radius: 999px; background: var(--surface-2); border: 1px solid var(--border); overflow: hidden; }
  .bar span { display: block; height: 100%; width: 0; background: var(--accent); transition: width .4s ease; }
  .testline { display: flex; align-items: center; gap: .7rem; margin: .4rem 0 .2rem; flex-wrap: wrap; }
  .testmsg { font-size: .82rem; }
  .testmsg.ok { color: var(--ok); } .testmsg.err { color: var(--danger); }
  .journal { list-style: none; margin: 1rem 0 0; padding: .8rem 0 0; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: .35rem; font-size: .86rem; }
  .journal li { display: grid; grid-template-columns: 1.2rem 1fr; column-gap: .4rem; color: var(--text-muted); }
  .journal li .ic { font-family: var(--font-mono); text-align: center; }
  .journal li.run .ic { color: var(--accent); animation: blink 1s ease-in-out infinite; }
  .journal li.ok { color: var(--text); }
  .journal li.ok .ic { color: var(--ok); }
  .journal li.ko { color: var(--danger); }
  .journal li .sub { grid-column: 2; margin-top: .2rem; font-size: .8rem; color: var(--text-faint); display: flex; flex-direction: column; gap: .15rem; }
  .journal li .sub .ko { color: var(--danger); }
  @keyframes blink { 50% { opacity: .35; } }
  .sub-h { font-size: .95rem; margin: 1.1rem 0 .2rem; padding-top: .8rem; border-top: 1px solid var(--border); }
</style>
