import { A as maybeRenderHead, C as renderComponent, N as addAttribute, k as renderTemplate, w as Fragment } from "./sequence_PGj_G6K4.mjs";
import { t as createComponent } from "./astro-component_Bf647iZ6.mjs";
import { t as createAstro } from "./compiler_BvEsyfv7.mjs";
import { a as appareilHref, d as isKnownAppareil, l as t, n as ROUTES, r as actionLabels, u as DEVICE_TYPE } from "./i18n_CIzekdEZ.mjs";
import { t as $$LinkCodeForm } from "./LinkCodeForm_CAPPcKE_.mjs";
import { i as listBoitiers, r as listAppareils, t as getAccountInfo } from "./cloud-data_C-XxM6mz.mjs";
// src/components/VoletCard.astro
createAstro("https://astro.build");
var $$VoletCard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$VoletCard;
	const { appareil: a, boitierName, lang, grouped = false } = Astro.props;
	const s = t(lang);
	const act = actionLabels(a.type, lang);
	const isPortail = a.type === DEVICE_TYPE.portail;
	const showPos = a.positional && a.position !== null;
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute(["volet", { offline: !a.online }], "class:list")}${addAttribute(a.boitierId, "data-box")}><div class="top"><span class="ico">${isPortail ? renderTemplate`<svg viewBox="0 0 24 24" width="1.05em" height="1.05em" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 8h12v12H4M4 11h12M4 14h12M4 17h12M1 20h22M18 14h4M20 12l2 2-2 2"></path></svg>` : "🪟"}</span><span class="vname">${a.name}</span>${showPos && renderTemplate`<span class="pct">${a.position} %</span>`}</div><div class="dpad"${addAttribute(a.boitierId, "data-device")}${addAttribute(a.slug, "data-slug")}><button type="button" data-action="UP"${addAttribute(act.up, "title")}${addAttribute(act.up, "aria-label")}${addAttribute(!a.online, "disabled")}>▲</button><button type="button" data-action="STOP"${addAttribute(act.stop, "title")}${addAttribute(act.stop, "aria-label")}${addAttribute(!a.online, "disabled")}>■</button><button type="button" data-action="DOWN"${addAttribute(act.down, "title")}${addAttribute(act.down, "aria-label")}${addAttribute(!a.online, "disabled")}>▼</button></div>${a.positional && renderTemplate`<div class="slat"${addAttribute(`--p:${a.position ?? 0}${a.online ? "" : ";opacity:.5"}`, "style")}${addAttribute(showPos ? `${a.position} %` : void 0, "title")}></div>`}<div class="foot">${grouped ? renderTemplate`<span class="box-tag">${!a.online && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span class="dot off"></span>${s.offlineShort}` })}`}</span>` : renderTemplate`<span class="box-tag"><span${addAttribute(["dot", { off: !a.online }], "class:list")}></span>${boitierName}${!a.online && s.offlineSuffix}</span>`}<button class="gear" type="button" data-det${addAttribute(s.details, "title")}${addAttribute(s.details, "aria-label")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></button></div><div class="hw-det" hidden><div class="mini-field"><input type="text"${addAttribute(a.name, "value")}${addAttribute(s.nameLabel, "aria-label")}><button class="btn sm primary" type="button">${s.rename}</button></div><div class="kv"><span class="k">${s.typeWord}</span><span class="v">${a.type} · ${a.positional ? s.positional : s.impulsional}</span></div>${showPos && renderTemplate`<div class="kv"><span class="k">${s.posWord}</span><span class="v">${a.position} %</span></div>`}${a.rssiDbm != null && renderTemplate`<div class="kv"><span class="k">${s.wifiSignal}</span><span class="v">${s.radioState(a.rssiDbm)}</span></div>`}${!a.online && renderTemplate`<div class="kv"><span class="k">${s.state}</span><span class="v">${s.offline}</span></div>`}</div></div>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/VoletCard.astro", void 0);
// src/components/UnknownDeviceCard.astro
createAstro("https://astro.build");
var $$UnknownDeviceCard = createComponent(($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$UnknownDeviceCard;
	const { appareil: a, boitierName, lang, grouped = false } = Astro.props;
	const s = t(lang);
	return renderTemplate`${maybeRenderHead($$result)}<div${addAttribute([
		"volet",
		"unknown",
		{ offline: !a.online }
	], "class:list")}${addAttribute(a.boitierId, "data-box")}><div class="top"><span class="ico" aria-hidden="true">?</span><span class="vname">${a.name}</span></div><p class="note unknown-note"><strong>${s.unknownDevice}</strong><br>${a.declaredType ? s.unknownDeclared(a.declaredType) : s.unknownNoType}</p><div class="foot">${grouped ? renderTemplate`<span class="box-tag">${!a.online && renderTemplate`${renderComponent($$result, "Fragment", Fragment, {}, { "default": ($$result) => renderTemplate`<span class="dot off"></span>${s.offlineShort}` })}`}</span>` : renderTemplate`<span class="box-tag"><span${addAttribute(["dot", { off: !a.online }], "class:list")}></span>${boitierName}${!a.online && s.offlineSuffix}</span>`}</div></div>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/UnknownDeviceCard.astro", void 0);
// src/components/views/AppareilsView.astro
createAstro("https://astro.build");
var $$AppareilsView = createComponent(async ($$result, $$props, $$slots) => {
	const Astro = $$result.createAstro($$props, $$slots);
	Astro.self = $$AppareilsView;
	const { lang, accountId } = Astro.props;
	const s = t(lang);
	const [account, boitiers, appareils] = await Promise.all([
		getAccountInfo(accountId),
		listBoitiers(accountId),
		listAppareils(accountId)
	]);
	const coversOf = (boitierId) => appareils.filter((a) => a.boitierId === boitierId);
	return renderTemplate`${maybeRenderHead($$result)}<div class="page-head"><h1>${s.appareilsTitle}</h1></div><p class="lead">${account.email} · ${s.leadAppareils(boitiers.length)}</p>${boitiers.length ? boitiers.map((b) => {
		const covers = coversOf(b.id);
		return renderTemplate`<section class="appareil-group"><div class="grp-head"${addAttribute(b.online ? void 0 : "opacity:.75", "style")}><span${addAttribute(["dot", { off: !b.online }], "class:list")}></span><span class="grp-name">${b.name}</span>${b.updateAvailable && renderTemplate`<span class="pill upd">${s.updAvail}</span>`}<span class="grp-sub">${covers.length} ${s.devicesWord}</span><span style="flex:1"></span><a class="gear"${addAttribute(appareilHref(b.id, lang), "href")}${addAttribute(s.configure, "title")}${addAttribute(`${s.configure} ${b.name}`, "aria-label")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></a></div>${covers.length ? renderTemplate`<div class="hw-grid">${covers.map((a) => isKnownAppareil(a) ? renderTemplate`${renderComponent($$result, "VoletCard", $$VoletCard, {
			"appareil": a,
			"boitierName": b.name,
			"lang": lang,
			"grouped": true
		})}` : renderTemplate`${renderComponent($$result, "UnknownDeviceCard", $$UnknownDeviceCard, {
			"appareil": a,
			"boitierName": b.name,
			"lang": lang,
			"grouped": true
		})}`)}</div>` : renderTemplate`<p class="empty">${s.noCovers}</p>`}</section>`;
	}) : renderTemplate`<section class="welcome"><h2>${s.welcomeTitle}</h2><p class="note">${s.welcomeLead}</p><ol class="welcome-steps"><li>${s.welcomeStep1}</li><li>${s.welcomeStep2}</li><li>${s.welcomeStep3}</li></ol>${renderComponent($$result, "LinkCodeForm", $$LinkCodeForm, { "lang": lang })}<p class="legacy">${s.legacyHint} <a${addAttribute(ROUTES.ajouter[lang], "href")}>${s.legacyLink}</a></p></section>`}<script>
  (function () {
    // roue crantee de chaque carte : montre/cache les details materiel.
    document.querySelectorAll('.gear[data-det]').forEach(function (g) {
      g.addEventListener('click', function () {
        var card = g.closest('.volet'); if (!card) return;
        var d = card.querySelector('.hw-det');
        if (d) d.hidden = !d.hidden;
      });
    });
    // commandes : chaque bouton du dpad envoie device_id + slug + action au relais.
    document.querySelectorAll('.dpad').forEach(function (pad) {
      var device = pad.getAttribute('data-device'), slug = pad.getAttribute('data-slug');
      pad.querySelectorAll('button[data-action]').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return;
          b.classList.add('sending');
          fetch('/api/cmd', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ device_id: device, slug: slug, action: b.getAttribute('data-action') }) })
            .catch(function () {})
            .finally(function () { setTimeout(function () { b.classList.remove('sending'); }, 400); });
        });
      });
    });
  })();
<\/script>`;
}, "/home/olivier/projects/isno-cloud/web/src/components/views/AppareilsView.astro", void 0);
export { $$AppareilsView as t };
