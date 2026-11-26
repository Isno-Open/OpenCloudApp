import { test } from "node:test";
import assert from "node:assert/strict";
import { planGooglePush, settleGooglePush, type GooglePushMemory } from "./google-home.js";

const A = { online: true, openPercent: 100 }, B = { online: true, openPercent: 0 };
// ce que SYNC declare de chaque appareil
const D = { "box:a": { name: "Salon" }, "box:b": { name: "Chambre" } };

test("Google Home : premier passage, la liste et l'etat partent", () => {
  const p = planGooglePush({}, { "box:b": B, "box:a": A }, D);
  assert.equal(p.sync, true);
  assert.equal(p.report, true);
  assert.equal(p.listing, planGooglePush({}, { "box:a": A, "box:b": B }, D).listing, "liste triee : l'ordre des appareils ne compte pas");
});

test("Google Home : rien n'a change, rien ne part (un boitier publie sa sante chaque minute)", () => {
  const first = planGooglePush({}, { "box:a": A, "box:b": B }, D);
  const again = planGooglePush({ listing: first.listing, states: first.states }, { "box:b": B, "box:a": A }, D);
  assert.equal(again.sync, false);
  assert.equal(again.report, false);
});

test("Google Home : un etat change, seul l'etat part", () => {
  const first = planGooglePush({}, { "box:a": A }, D);
  const moved = planGooglePush({ listing: first.listing, states: first.states }, { "box:a": { online: true, openPercent: 40 } }, D);
  assert.equal(moved.sync, false);
  assert.equal(moved.report, true);
  const offline = planGooglePush({ listing: first.listing, states: first.states }, { "box:a": { online: false, openPercent: 100 } }, D);
  assert.equal(offline.report, true, "un boitier qui tombe se dit a Google");
});

test("Google Home : un appareil ajoute ou retire demande une resynchronisation", () => {
  const first = planGooglePush({}, { "box:a": A }, D);
  const known = { listing: first.listing, states: first.states };
  assert.equal(planGooglePush(known, { "box:a": A, "box:b": B }, D).sync, true);
  const emptied = planGooglePush(known, {}, D);
  assert.equal(emptied.sync, true, "dernier appareil retire : Google doit l'apprendre");
  assert.equal(emptied.report, false, "aucun etat a pousser pour une liste vide");
});

test("Google Home : un envoi rate se rejoue (la memoire ne retient que ce qui est parti)", () => {
  const first = planGooglePush({}, { "box:a": A }, D);
  const retry = planGooglePush({ listing: first.listing }, { "box:a": A }, D);   // Request Sync parti, Report State rate
  assert.equal(retry.sync, false);
  assert.equal(retry.report, true);
});

test("Google Home : un appareil retire puis remis dans le meme etat repart avec son etat", () => {
  const first = planGooglePush({}, { "box:a": A }, D);
  const known = { listing: first.listing, states: first.states };
  const removed = planGooglePush(known, {}, D);
  known.listing = removed.listing;   // Request Sync parti ; aucun etat a pousser, la memoire d'etat reste
  const back = planGooglePush(known, { "box:a": A }, D);
  assert.equal(back.sync, true);
  assert.equal(back.report, true, "l'appareil recree chez Google n'a pas d'etat tant qu'on ne le pousse pas");
});

test("Google Home : apres une resynchronisation reussie, un Report State rate reste a rejouer", () => {
  let known: GooglePushMemory = {};
  const first = planGooglePush(known, { "box:a": A }, D);
  known = settleGooglePush(known, first, { sync: true, report: true });
  const removed = planGooglePush(known, {}, D);
  known = settleGooglePush(known, removed, { sync: true, report: false });
  const back = planGooglePush(known, { "box:a": A }, D);
  known = settleGooglePush(known, back, { sync: true, report: false });   // liste partie, etat refuse
  const retry = planGooglePush(known, { "box:a": A }, D);
  assert.equal(retry.sync, false, "la liste est a jour chez Google");
  assert.equal(retry.report, true, "l'etat n'est jamais arrive : il repart");
  known = settleGooglePush(known, retry, { sync: false, report: true });
  assert.equal(planGooglePush(known, { "box:a": A }, D).report, false, "une fois parti, plus rien a dire");
});

test("Google Home : une resynchronisation ratee se rejoue, et l'etat avec", () => {
  let known: GooglePushMemory = {};
  const first = planGooglePush(known, { "box:a": A }, D);
  known = settleGooglePush(known, first, { sync: false, report: false });
  const retry = planGooglePush(known, { "box:a": A }, D);
  assert.equal(retry.sync, true);
  assert.equal(retry.report, true);
});

test("Google Home : un appareil renomme garde son identifiant, et Google doit quand meme l'apprendre", () => {
  const first = planGooglePush({}, { "box:a": A, "box:b": B }, D);
  const known = { listing: first.listing, states: first.states };
  const renamed = planGooglePush(known, { "box:a": A, "box:b": B }, { ...D, "box:a": { name: "Séjour" } });
  assert.equal(renamed.sync, true, "meme liste d'identifiants, autre nom : Request Sync");
  assert.equal(planGooglePush(known, { "box:a": A, "box:b": B }, { "box:b": { name: "Chambre" }, "box:a": { name: "Salon" } }).sync, false, "rien de declare n'a change : pas de Request Sync");
});
