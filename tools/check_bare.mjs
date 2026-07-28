/**
 * check_bare.mjs - proves the dive is only a grid, RAM and turns.
 *
 * This check exists because of a real bug. The engine was originally
 * vendored whole from the game and the program layer was switched off with
 * configuration: abilityFreq 0. That was asserted, never tested, and it was
 * wrong. `abilityFreq` gates only one of five cast rules in the opponent's
 * planner, so the intrusion cast REDIRECT in 49 of 60 dives.
 *
 * The fix was to delete the capability rather than configure it off. This
 * check is what keeps it deleted, and it checks twice:
 *
 *   1. Statically, that the forbidden vocabulary does not appear in engine/.
 *   2. At runtime, that a few hundred dives emit no event outside the
 *      rotation race's own vocabulary.
 *
 * The runtime half is the one that matters. A static grep can be satisfied
 * by renaming something; only playing the game proves nothing casts.
 *
 *   node tools/check_bare.mjs
 */

import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const problems = [];

/* ------------------------------------------------------------------ */
/* 1. static                                                           */
/* ------------------------------------------------------------------ */

// Each entry is a capability that does not belong in a rotation race.
const FORBIDDEN = [
  "abilityFreq", "augment", "patchPouch", "patchCell",
  "trap", "siphon", "armHalt", "redirect", "purge", "ward",
  "scanTier", "attackTier", "defendTier", "oppTier", "dominant",
  "attackMode", "defendMode", "tutorial",
];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.name.endsWith(".ts")) out.push(p);
  }
  return out;
}

const files = walk(path.join(root, "engine"));
for (const file of files) {
  const rel = path.relative(root, file);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    // The header comments explain what is absent and why. Naming a thing in
    // order to say it is gone is the opposite of shipping it.
    const trimmed = line.trim();
    if (trimmed.startsWith("*") || trimmed.startsWith("//") || trimmed.startsWith("/*")) return;
    for (const word of FORBIDDEN) {
      // Anchored at an identifier boundary so "toward" and "outward" are not
      // read as "ward", but wardThroughRound still is. Unanchored substring
      // matching flagged two innocent strings the first time this ran.
      if (new RegExp(`\\b${word}`, "i").test(line)) {
        problems.push(`${rel}:${i + 1}  contains "${word}"\n      ${trimmed}`);
      }
    }
  });
}

const staticCount = problems.length;

/* ------------------------------------------------------------------ */
/* 2. runtime                                                          */
/* ------------------------------------------------------------------ */

const bundlePath = path.join(root, "play", "engine.bundle.js");
if (!fs.existsSync(bundlePath)) {
  console.error(`engine bundle missing at ${path.relative(root, bundlePath)}`);
  process.exit(1);
}
(0, eval)(fs.readFileSync(bundlePath, "utf8"));
const KP = globalThis.KP;

// Everything a rotation race is allowed to say.
const ALLOWED = new Set([
  "rotate", "claim", "claimOpp", "cascade", "cascadeOpp",
  "cascadeRam", "cascadeRamOpp", "endTurn", "oppAim",
  "win", "lose", "deny",
]);

const SPECS = [
  { grid: [9, 7], playerRam: 5, oppRam: 5, greed: 0.85, minCost: 18, minPd: 8, headStart: 0, slag: 0.18, parFlat: 3 },
  { grid: [11, 9], playerRam: 5, oppRam: 6, greed: 0.9, minCost: 22, minPd: 8, headStart: 2, slag: 0.2, parFlat: 3 },
  { grid: [13, 11], playerRam: 5, oppRam: 4, greed: 0.7, minCost: 26, minPd: 8, headStart: 1, slag: 0.22, parFlat: 3 },
];

const seen = new Set();
let dives = 0;

for (const spec of SPECS) {
  const cfg = KP.specToConfig({ ...spec, id: "check", difficulty: "check", targetWinPct: 50 });
  for (let seed = 1; seed <= 100; seed++) {
    const s = KP.createDuel(cfg, seed, spec.playerRam);
    let guard = 0;
    while (s.phase === "playing" && guard++ < 4000) {
      if (s.turn === "player") {
        KP.botPlayTurn(s, "player", 0.95);
        if (s.phase === "playing" && s.turn === "player") KP.endPlayerTurn(s);
      } else {
        KP.oppStep(s);
      }
      for (const e of s.fx) seen.add(e.kind);
    }
    for (const e of s.fx) seen.add(e.kind);
    dives++;
  }
}

const stray = [...seen].filter((k) => !ALLOWED.has(k));
for (const k of stray) {
  problems.push(`runtime: a dive emitted "${k}", which is not part of the rotation race`);
}

// The state shape itself must carry no program bookkeeping.
{
  const cfg = KP.specToConfig({ ...SPECS[0], id: "c", difficulty: "c", targetWinPct: 50 });
  const s = KP.createDuel(cfg, 1, 5);
  const econKeys = Object.keys(s.econ.player);
  for (const bad of ["used", "attacksCast", "defendsCast", "scansCast", "trapsFired", "placedThisTurn"]) {
    if (econKeys.includes(bad)) problems.push(`runtime: SideEcon still carries "${bad}"`);
  }
  const cellKeys = Object.keys(s.cells[0]);
  for (const bad of ["trap", "fused", "lockedThroughRound", "wardThroughRound"]) {
    if (cellKeys.includes(bad)) problems.push(`runtime: DuelCell still carries "${bad}"`);
  }
  if ("kit" in s) problems.push('runtime: DuelState still carries "kit"');
  if ("patchPouch" in s) problems.push('runtime: DuelState still carries "patchPouch"');
}

/* ------------------------------------------------------------------ */

console.log("check_bare.mjs");
console.log(`  static   ${files.length} engine files scanned, ${staticCount} forbidden reference(s)`);
console.log(`  runtime  ${dives} dives played`);
console.log(`  events   ${[...seen].sort().join(", ")}`);

if (problems.length === 0) {
  console.log("\n  OK. The dive is a grid, RAM and turns.");
  process.exit(0);
}

console.error(`\n  ${problems.length} problem(s):`);
for (const p of problems) console.error(`  ! ${p}`);
console.error(
  "\nThe program layer must be absent, not disabled. Delete the code rather " +
  "than configuring it off.",
);
process.exit(1);
