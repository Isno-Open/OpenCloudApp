import { test } from "node:test";
import assert from "node:assert/strict";
import { planGooglePush } from "./google-home.js";

const A = { online: true, openPercent: 100 }, B = { online: true, openPercent: 0 };

test("Google Home : premier passage, la liste et l'etat partent", () => {
  const p = planGooglePush({}, { "box:b": B, "box:a": A });
  assert.equal(p.sync, true);
  assert.equal(p.report, true);
  assert.equal(p.ids, "box:a,box:b", "liste triee : l'ordre des appareils ne compte pas");
});

test("Google Home : rien n'a change, rien ne part (un boitier publie sa sante chaque minute)", () => {
  const first = planGooglePush({}, { "box:a": A, "box:b": B });
  const again = planGooglePush({ ids: first.ids, states: first.states }, { "box:b": B, "box:a": A });
  assert.equal(again.sync, false);
  assert.equal(again.report, false);
});

test("Google Home : un etat change, seul l'etat part", () => {
  const first = planGooglePush({}, { "box:a": A });
  const moved = planGooglePush({ ids: first.ids, states: first.states }, { "box:a": { online: true, openPercent: 40 } });
  assert.equal(moved.sync, false);
  assert.equal(moved.report, true);
  const offline = planGooglePush({ ids: first.ids, states: first.states }, { "box:a": { online: false, openPercent: 100 } });
  assert.equal(offline.report, true, "un boitier qui tombe se dit a Google");
});

test("Google Home : un appareil ajoute ou retire demande une resynchronisation", () => {
  const first = planGooglePush({}, { "box:a": A });
  const known = { ids: first.ids, states: first.states };
  assert.equal(planGooglePush(known, { "box:a": A, "box:b": B }).sync, true);
  const emptied = planGooglePush(known, {});
  assert.equal(emptied.sync, true, "dernier appareil retire : Google doit l'apprendre");
  assert.equal(emptied.report, false, "aucun etat a pousser pour une liste vide");
});

test("Google Home : un envoi rate se rejoue (la memoire ne retient que ce qui est parti)", () => {
  const first = planGooglePush({}, { "box:a": A });
  const retry = planGooglePush({ ids: first.ids }, { "box:a": A });   // Request Sync parti, Report State rate
  assert.equal(retry.sync, false);
  assert.equal(retry.report, true);
});

test("Google Home : un appareil retire puis remis dans le meme etat repart avec son etat", () => {
  const first = planGooglePush({}, { "box:a": A });
  const known = { ids: first.ids, states: first.states };
  const removed = planGooglePush(known, {});
  known.ids = removed.ids;   // Request Sync parti ; aucun etat a pousser, la memoire d'etat reste
  const back = planGooglePush(known, { "box:a": A });
  assert.equal(back.sync, true);
  assert.equal(back.report, true, "l'appareil recree chez Google n'a pas d'etat tant qu'on ne le pousse pas");
});
