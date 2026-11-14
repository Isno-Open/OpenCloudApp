// Comparaison de versions de firmware (semver : MAJEUR.MINEUR.CORRECTIF, suffixe de pre-version
// eventuel). Sert a proposer une mise a jour SEULEMENT vers plus recent : un boitier en version de
// test 0.2.16-essai ne se voit pas proposer la 0.2.15 publiee (constate le 2026-11-14 sur le M5).
const SEMVER_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.+-]+))?$/;

type Parsed = { core: [number, number, number]; pre: string | null };
const parse = (v: string): Parsed | null => {
  const m = SEMVER_RE.exec(v.trim());
  return m ? { core: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null } : null;
};

/** `latest` est-elle strictement plus recente que `installed` ? Dans le doute (forme inconnue, deux
 *  pre-versions du meme numero), non : on ne propose pas une mise a jour qu'on ne sait pas classer. */
export function isNewerVersion(latest: string, installed: string): boolean {
  const a = parse(latest), b = parse(installed);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a.core[i] !== b.core[i]) return a.core[i]! > b.core[i]!;
  // meme numero : la version publiee l'emporte sur une pre-version, pas l'inverse
  return a.pre === null && b.pre !== null;
}
