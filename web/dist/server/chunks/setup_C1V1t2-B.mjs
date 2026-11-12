import { t as __exportAll } from "./rolldown-runtime_D8jQpDG7.mjs";
import { A as maybeRenderHead, C as renderComponent, N as addAttribute, P as defineScriptVars, k as renderTemplate, w as Fragment } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { t as $$BareLayout } from "./BareLayout_DyhOi8Zo.mjs";
import { l as t, t as LANG } from "./i18n_CIzekdEZ.mjs";
import { a as isConfigured, l as setupWindowRemaining, r as SETUP_WINDOW_S, t as DB_KIND } from "./config_2VUiG471.mjs";
// src/pages/setup.astro
var setup_exports = /* @__PURE__ */ __exportAll({
	default: () => $$Setup,
	file: () => $$file,
	url: () => $$url
});
createAstro("https://astro.build");
var $$Setup = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$Setup;
	if (isConfigured()) return Astro.redirect("/");
	const remaining = setupWindowRemaining();
	const windowMin = Math.round(SETUP_WINDOW_S / 60);
	return renderTemplate`${renderComponent($$result, "BareLayout", $$BareLayout, {
		"title": "Configuration",
		"lang": LANG.fr,
		"data-astro-cid-oustkjpu": true
	}, { "default": ($$result) => renderTemplate`${maybeRenderHead($$result)}<div class="setup" data-astro-cid-oustkjpu><div class="setup-head" data-astro-cid-oustkjpu><span class="eyebrow" data-astro-cid-oustkjpu>// onboarding</span><h1 data-astro-cid-oustkjpu>Configuration du portail</h1><p class="sub" data-astro-cid-oustkjpu>Première installation : deux étapes, puis le portail redémarre configuré.</p>${remaining > 0 && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<p class="window" id="windowBar" data-astro-cid-oustkjpu>Installation ouverte encore <b id="countdown" data-astro-cid-oustkjpu>${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}</b>. Par sécurité, elle se ferme ${windowMin} minutes après le démarrage du serveur.</p><div class="steps" data-astro-cid-oustkjpu><span class="st active" data-dot="1" data-astro-cid-oustkjpu>1 · Base de données</span><span class="st" data-dot="2" data-astro-cid-oustkjpu>2 · Socle</span></div>` })}`}</div><div class="setup-card expired" id="expired"${addAttribute(remaining > 0, "hidden")} data-astro-cid-oustkjpu><h3 data-astro-cid-oustkjpu>Délai d'installation dépassé</h3><p class="note" data-astro-cid-oustkjpu>Par sécurité, l'installation n'est ouverte que pendant les ${windowMin} minutes qui suivent le démarrage du serveur : sinon, n'importe qui trouvant ce portail en ligne pourrait le configurer à votre place.</p><p class="note" data-astro-cid-oustkjpu>Redémarrez le serveur, puis rechargez cette page :</p><pre class="cmd" data-astro-cid-oustkjpu>docker compose restart server</pre></div>${remaining > 0 && renderTemplate`<form id="setupForm" class="setup-card" data-astro-cid-oustkjpu><!-- Etape 1 : base de donnees --><section class="step" data-step="1" data-astro-cid-oustkjpu><h3 data-astro-cid-oustkjpu>Base de données</h3><label class="opt" data-astro-cid-oustkjpu><input type="radio" name="kind" value="" data-k="sqlite" checked data-astro-cid-oustkjpu><span data-astro-cid-oustkjpu><b data-astro-cid-oustkjpu>SQLite</b> (embarqué, recommandé). Rien à installer, un fichier sur le volume. Idéal pour un parc modeste.</span></label><label class="opt" data-astro-cid-oustkjpu><input type="radio" name="kind" value="" data-k="mongoBundled" data-astro-cid-oustkjpu><span data-astro-cid-oustkjpu><b data-astro-cid-oustkjpu>MongoDB fourni</b>. Installé automatiquement sur ce serveur (téléchargement de quelques centaines de Mo). Pour grandir.</span></label><label class="opt" data-astro-cid-oustkjpu><input type="radio" name="kind" value="" data-k="mongoExternal" data-astro-cid-oustkjpu><span data-astro-cid-oustkjpu><b data-astro-cid-oustkjpu>MongoDB externe</b>. Votre propre serveur Mongo.</span></label><div class="bar" id="moduleBarWrap" hidden data-astro-cid-oustkjpu><span id="moduleBar" data-astro-cid-oustkjpu></span></div><div class="field" id="mongoUrlField" hidden data-astro-cid-oustkjpu><label for="mongoUrl" data-astro-cid-oustkjpu>URL Mongo</label><input id="mongoUrl" name="mongoUrl" type="text" placeholder="mongodb://utilisateur:motdepasse@hote:27017/isno_cloud" spellcheck="false" data-astro-cid-oustkjpu></div><div class="testline" id="testLine" hidden data-astro-cid-oustkjpu><button type="button" class="btn ghost" id="testBtn" data-astro-cid-oustkjpu>Tester la connexion</button><span class="testmsg" id="testMsg" data-astro-cid-oustkjpu></span></div><div class="row end" data-astro-cid-oustkjpu><button type="button" class="btn primary" data-next="1" data-astro-cid-oustkjpu>Continuer</button></div></section><!-- Etape 2 : socle --><section class="step" data-step="2" hidden data-astro-cid-oustkjpu><h3 data-astro-cid-oustkjpu>Socle</h3><div class="field" data-astro-cid-oustkjpu><label for="appHost" data-astro-cid-oustkjpu>Nom d'hôte du portail</label><input id="appHost" name="appHost" type="text" placeholder="cloud.exemple.fr" spellcheck="false" autocapitalize="none" required data-astro-cid-oustkjpu><span class="hint" data-astro-cid-oustkjpu>L'adresse où vous êtes en ce moment.</span></div><div class="field" data-astro-cid-oustkjpu><label for="brokerHost" data-astro-cid-oustkjpu>Nom d'hôte du broker MQTT</label><input id="brokerHost" name="brokerHost" type="text" placeholder="mqtt.exemple.fr" spellcheck="false" autocapitalize="none" required data-astro-cid-oustkjpu><span class="hint" data-astro-cid-oustkjpu>Le nom sous lequel les boîtiers joindront le broker : public (Internet) ou réseau local. Son certificat sera créé avec ce nom.</span></div><div class="bar" id="brokerBarWrap" hidden data-astro-cid-oustkjpu><span id="brokerBar" data-astro-cid-oustkjpu></span></div><h3 class="sub-h" data-astro-cid-oustkjpu>Opérateur du portail</h3><div class="field" data-astro-cid-oustkjpu><label for="adminEmail" data-astro-cid-oustkjpu>E-mail</label><input id="adminEmail" name="adminEmail" type="email" autocomplete="email" required data-astro-cid-oustkjpu><span class="hint" data-astro-cid-oustkjpu>Votre identifiant de connexion. Vous aurez accès à Paramètres et Plugins.</span></div><div class="field" data-astro-cid-oustkjpu><label for="adminName" data-astro-cid-oustkjpu>Nom</label><input id="adminName" name="adminName" type="text" autocomplete="name" maxlength="80" required data-astro-cid-oustkjpu></div><div class="field" data-astro-cid-oustkjpu><label for="adminPassword" data-astro-cid-oustkjpu>Mot de passe</label><input id="adminPassword" name="adminPassword" type="password" autocomplete="new-password" minlength="8" required data-astro-cid-oustkjpu><span class="hint" data-astro-cid-oustkjpu>8 caractères minimum.</span></div><label class="check" style="margin-top:.4rem" data-astro-cid-oustkjpu><input type="checkbox" id="userAdmin" checked data-astro-cid-oustkjpu> ${t(LANG.fr).setupUserAdmin}</label><span class="hint" data-astro-cid-oustkjpu>${t(LANG.fr).setupUserAdminHint}</span><div class="row" data-astro-cid-oustkjpu><button type="button" class="btn ghost" data-prev="2" data-astro-cid-oustkjpu>Retour</button><button type="submit" class="btn primary" id="finishBtn" data-astro-cid-oustkjpu>Terminer et démarrer</button></div><p class="formerr" id="formErr" hidden data-astro-cid-oustkjpu></p></section><!-- Etape 3 : redemarrage --><section class="step done" data-step="3" hidden data-astro-cid-oustkjpu><h3 data-astro-cid-oustkjpu>Démarrage…</h3><p class="note" data-astro-cid-oustkjpu>Configuration enregistrée. Le portail redémarre avec la base choisie, puis cette page ouvre la connexion : identifiez-vous avec l'e-mail de l'opérateur.</p></section><!-- Journal : chaque operation sur sa ligne, conserve d'une etape a l'autre --><ol class="journal" id="journal" hidden data-astro-cid-oustkjpu></ol></form>`}</div><script>(function(){${defineScriptVars({
		KIND: DB_KIND,
		remaining
	})}
    (function () {
      var form = document.getElementById('setupForm');
      if (!form) return;
      var $ = function (id) { return document.getElementById(id); };
      var expired = $('expired'), done = false;
      var post = function (url, body) {
        return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
          .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); });
      };
      var getJson = function (url) { return fetch(url).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); }); };

      // Compte a rebours de la fenetre : a zero, on bascule sur l'ecran « delai depasse ».
      var deadline = Date.now() + remaining * 1000, cd = $('countdown');
      var tick = setInterval(function () {
        var left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        cd.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
        if (left === 0 && !done) {
          clearInterval(tick); form.hidden = true; $('windowBar').hidden = true;
          document.querySelector('.steps').hidden = true; expired.hidden = false;
        }
      }, 1000);

      function show(n) {
        form.querySelectorAll('.step').forEach(function (s) { s.hidden = s.getAttribute('data-step') !== String(n); });
        document.querySelectorAll('.steps .st').forEach(function (d) { d.classList.toggle('active', d.getAttribute('data-dot') === String(Math.min(n, 2))); });
      }
      function kind() { var r = form.querySelector('input[name=kind]:checked'); return r ? r.getAttribute('data-k') : 'sqlite'; }
      function dbPayload() { return { kind: KIND[kind()], mongoUrl: ($('mongoUrl') || {}).value || '' }; }

      // Journal : une ligne par operation (en cours -> ok / echec), jamais effacee.
      var journal = $('journal');
      var ICON = { run: '◌', ok: '✓', ko: '✗' };
      function step(key, text) {
        journal.hidden = false;
        var li = journal.querySelector('[data-k="' + key + '"]');
        if (!li) { li = document.createElement('li'); li.setAttribute('data-k', key); li.innerHTML = '<span class="ic"></span><span class="tx"></span>'; journal.appendChild(li); }
        var api = {
          run: function (t) { li.className = 'run'; li.querySelector('.ic').textContent = ICON.run; li.querySelector('.tx').textContent = t || text; return api; },
          ok: function (t) { li.className = 'ok'; li.querySelector('.ic').textContent = ICON.ok; li.querySelector('.tx').textContent = t || text; return api; },
          ko: function (t) { li.className = 'ko'; li.querySelector('.ic').textContent = ICON.ko; li.querySelector('.tx').textContent = t || text; return api; },
          sub: function (lines) {
            var old = li.querySelector('.sub'); if (old) old.remove();
            var d = document.createElement('span'); d.className = 'sub';
            lines.forEach(function (l) { var e = document.createElement('span'); e.className = l.ok ? '' : 'ko'; e.textContent = (l.ok ? '✓ ' : '✗ ') + l.text; d.appendChild(e); });
            li.appendChild(d); return api;
          },
        };
        return api.run(text);
      }

      // Attend qu'un module soit pret ; la progression s'affiche dans sa ligne du journal.
      function waitModule(statusUrl, line, barWrap, bar, label) {
        return new Promise(function (resolve, reject) {
          var tries = 0;
          var iv = setInterval(function () {
            tries++;
            getJson(statusUrl).then(function (res) {
              var m = res.d;
              if (!res.ok) { clearInterval(iv); reject(m.error || 'superviseur indisponible'); return; }
              if (m.ready) { clearInterval(iv); barWrap.hidden = true; resolve(m); return; }
              if (m.error && !m.busy) { clearInterval(iv); reject(m.error); return; }
              barWrap.hidden = false; bar.style.width = (m.progress || 0) + '%';
              line.run('Installation de ' + label + '… ' + (m.progress || 0) + ' %');
              if (tries > 240) { clearInterval(iv); reject(label + ' ne démarre pas'); }
            }).catch(function () {});
          }, 1000);
        });
      }

      // Etape 1 : on choisit ; « Continuer » verifie ou installe ce qu'il faut, puis passe a la suite.
      var next1 = form.querySelector('[data-next="1"]');
      function onKind() {
        var k = kind();
        $('mongoUrlField').hidden = (k !== 'mongoExternal');
        $('testLine').hidden = (k !== 'mongoExternal');
        $('testMsg').textContent = '';
      }
      form.querySelectorAll('input[name=kind]').forEach(function (r) { r.addEventListener('change', onKind); });
      next1.addEventListener('click', function () {
        var k = kind();
        if (k === 'sqlite') { step('db', '').ok('Base : SQLite embarqué'); show(2); return; }
        next1.disabled = true;
        if (k === 'mongoExternal') {
          var lx = step('db', 'Test de la connexion à MongoDB externe…');
          post('/api/setup/test-db', dbPayload()).then(function (res) {
            if (res.d.ok) { lx.ok('Base : MongoDB externe, connexion vérifiée'); next1.disabled = false; show(2); }
            else { lx.ko('MongoDB externe : ' + (res.d.error || 'connexion impossible')); next1.disabled = false; }
          }).catch(function () { lx.ko('MongoDB externe : erreur réseau'); next1.disabled = false; });
          return;
        }
        // MongoDB fourni : deja installe -> on passe ; sinon installation avec progression.
        var lm = step('db', 'Vérification de MongoDB…');
        var statusUrl = '/api/setup/module?kind=' + encodeURIComponent(KIND[k]);
        getJson(statusUrl).then(function (res) {
          if (!res.ok) throw res.d.error || 'superviseur indisponible';
          if (res.d.ready) return res.d;
          return post('/api/setup/module', { kind: KIND[k] }).then(function (r2) {
            if (!r2.ok) throw r2.d.error || 'installation impossible';
            return waitModule(statusUrl, lm, $('moduleBarWrap'), $('moduleBar'), 'MongoDB');
          });
        }).then(function () { lm.ok('Base : MongoDB installé et démarré'); next1.disabled = false; show(2); })
          .catch(function (e) { lm.ko('MongoDB : ' + String(e)); next1.disabled = false; });
      });
      $('testBtn').addEventListener('click', function () {
        var msg = $('testMsg'); msg.className = 'testmsg'; msg.textContent = 'Test…';
        post('/api/setup/test-db', dbPayload()).then(function (res) {
          msg.className = 'testmsg ' + (res.d.ok ? 'ok' : 'err'); msg.textContent = res.d.ok ? '✓ connexion OK' : ('✗ ' + (res.d.error || 'échec'));
        }).catch(function () { msg.className = 'testmsg err'; msg.textContent = '✗ erreur réseau'; });
      });
      form.querySelector('[data-prev="2"]').addEventListener('click', function () { show(1); });

      // Etape 2 : noms pre-remplis ; « Terminer » prepare le broker (certificat au nom choisi, installation
      // ou redemarrage), verifie les deux noms jusqu'a cette instance, puis enregistre.
      var LABEL = { appFormat: 'Portail : format', appDns: 'Portail : DNS', appReach: 'Portail : joignable', brokerFormat: 'Broker : format', brokerCert: 'Broker : certificat', brokerDns: 'Broker : DNS', brokerPort: 'Broker : joignable' };
      var err = $('formErr'), fb = $('finishBtn');
      var asLines = function (list) { return list.map(function (c) { return { ok: c.ok, text: (LABEL[c.check] || c.check) + ' : ' + c.detail }; }); };
      getJson('/api/setup/defaults').then(function (res) {
        if (res.d.appHost && !$('appHost').value) $('appHost').value = res.d.appHost;
        if (res.d.brokerHost && !$('brokerHost').value) $('brokerHost').value = res.d.brokerHost;
      }).catch(function () {});

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        err.hidden = true; fb.disabled = true;
        var hosts = { appHost: $('appHost').value.trim(), brokerHost: $('brokerHost').value.trim() };
        var lb = step('broker', 'Certificat du broker pour ' + hosts.brokerHost + '…');
        var lc, ls;
        var fail = function (line, msg) { if (line) line.ko(msg); err.hidden = false; err.textContent = msg; fb.disabled = false; };
        post('/api/setup/broker', { brokerHost: hosts.brokerHost }).then(function (res) {
          if (!res.ok) throw { line: lb, msg: 'Broker : ' + (res.d.error || 'préparation impossible') };
          lb.ok('Certificat du broker émis pour ' + hosts.brokerHost);
          lb = step('brokerRun', 'Installation du broker…');
          if (res.d.ready) return res.d;
          return waitModule('/api/setup/broker', lb, $('brokerBarWrap'), $('brokerBar'), 'broker').catch(function (m) { throw { line: lb, msg: 'Broker : ' + m }; });
        }).then(function () {
          lb.ok('Broker installé et démarré');
          lc = step('checks', 'Vérification des noms d\\'hôte…');
          return new Promise(function (r) { setTimeout(r, 2000); }).then(function () { return post('/api/setup/check-hosts', hosts); });
        }).then(function (res) {
          if (res.d.checks) lc.sub(asLines(res.d.checks));
          if (!res.d.ok) throw { line: lc, msg: 'Un nom ne mène pas à cette instance : voir le détail.' };
          lc.ok('Noms vérifiés : ' + hosts.appHost + ' et ' + hosts.brokerHost + ' mènent à cette instance');
          ls = step('save', 'Enregistrement de la configuration…');
          var db = dbPayload();
          return post('/api/setup/save', { kind: db.kind, mongoUrl: db.mongoUrl, appHost: hosts.appHost, brokerHost: hosts.brokerHost, adminEmail: $('adminEmail').value.trim(), adminName: $('adminName').value.trim(), adminPassword: $('adminPassword').value, userAdmin: $('userAdmin').checked });
        }).then(function (res) {
          if (!res.ok) { if (res.d.checks && lc) lc.sub(asLines(res.d.checks)); throw { line: ls, msg: 'Enregistrement : ' + (res.d.error || 'échec') }; }
          ls.ok('Configuration enregistrée');
          done = true; clearInterval(tick); $('windowBar').hidden = true; show(3);
          var lr = step('restart', 'Redémarrage du portail…');
          var tries = 0;
          var go = function () { location.href = '/connexion?local=1'; };
          var iv = setInterval(function () {
            tries++;
            getJson('/api/setup/status').then(function (r) {
              if (r.d.configured) { clearInterval(iv); lr.ok('Portail redémarré : ouverture de la connexion…'); setTimeout(go, 3000); }
            }).catch(function () {});
            if (tries > 60) { clearInterval(iv); lr.ko('Le portail tarde à redémarrer : rechargez la page dans un instant.'); }
          }, 1500);
        }).catch(function (x) { fail(x && x.line, x && x.msg ? x.msg : String(x)); });
      });

      show(1);
    })();
  })();<\/script>` })}`;
}, "/home/olivier/projects/isno-cloud/web/src/pages/setup.astro", void 0);
var $$file = "/home/olivier/projects/isno-cloud/web/src/pages/setup.astro";
var $$url = "/setup";
// \0virtual:astro:page:src/pages/setup@_@astro
var page = () => setup_exports;
export { page };
