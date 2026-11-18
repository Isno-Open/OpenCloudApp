// La charte du cloud (web/src/lib/styles/charte.css) est une COPIE de celle du boitier, dont le depot
// OpenProfalux est proprietaire (ui/src/styles/tokens.css). Ce controle refuse toute divergence entre la
// copie et le fichier du proprietaire, a la reference ecrite dans l'en-tete de la copie. Appele par
// « npm run build » du web (donc par l'image docker) : une copie retouchee a la main ne se construit pas.
//   node scripts/check-charte.mjs [chemin de la copie]
import { readFileSync } from "node:fs";

const OWNER_REPO = "Isno-Open/OpenProfalux";
const OWNER_PATH = "ui/src/styles/tokens.css";
const HEADER_LINES = 4;   // l'en-tete de la copie (proprietaire, reference), absent chez le proprietaire

const copyPath = process.argv[2] ?? new URL("../web/src/lib/styles/charte.css", import.meta.url).pathname;
const copy = readFileSync(copyPath, "utf8");
const ref = /OpenProfalux@([0-9a-f]{40})/.exec(copy)?.[1];
if (!ref) {
  console.error(`charte : reference du proprietaire introuvable dans l'en-tete de ${copyPath}`);
  process.exit(1);
}
const url = `https://raw.githubusercontent.com/${OWNER_REPO}/${ref}/${OWNER_PATH}`;
const res = await fetch(url);
if (!res.ok) {
  console.error(`charte : lecture du proprietaire impossible (${res.status}) : ${url}`);
  process.exit(1);
}
const owner = await res.text();
const body = copy.split("\n").slice(HEADER_LINES).join("\n");
if (body !== owner) {
  console.error(`charte : ${copyPath} differe de ${OWNER_REPO}@${ref.slice(0, 7)}:${OWNER_PATH}. Recopier le fichier du proprietaire, ne pas le retoucher ici.`);
  process.exit(1);
}
console.log(`charte : identique a ${OWNER_REPO}@${ref.slice(0, 7)}`);
