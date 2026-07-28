/**
 * Headless dive simulator.
 *
 * Plays a crew-authored dive spec N times against a greedy reference player
 * and reports the win rate. This is what turns targetWinPct from an argument
 * into a measurement: the Board Architect claims a number, and this says
 * whether the board actually delivers it.
 *
 * The reference player is deliberately simple. It rotates whatever the
 * engine's own route planner says is the cheapest next step toward the core,
 * spends every point of RAM each turn, and never does anything clever. A
 * dive it wins most of the time is easy; a dive it rarely wins is hard.
 *
 *   node tools/simulate.mjs out/dive-hard.json
 *   node tools/simulate.mjs out/dive-hard.json --seeds 500
 */

import fs from "node:fs";
import path from "node:path";

const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, "..");

// The bundle is an IIFE that assigns a global. Evaluate it and grab it.
const bundlePath = path.join(root, "play", "engine.bundle.js");
if (!fs.existsSync(bundlePath)) {
  console.error(
    `engine bundle missing at ${bundlePath}\n` +
      `rebuild it with:  bun build engine/browser-entry.ts ` +
      `--outfile=play/engine.bundle.js --format=iife --target=browser`,
  );
  process.exit(1);
}
(0, eval)(fs.readFileSync(bundlePath, "utf8"));
const KP = globalThis.KP;

const args = process.argv.slice(2);
const specPath = args.find((a) => !a.startsWith("--"));
const seedsArg = args.indexOf("--seeds");
const SEEDS = seedsArg >= 0 ? parseInt(args[seedsArg + 1], 10) : 200;

if (!specPath) {
  console.error("usage: node tools/simulate.mjs <dive.json> [--seeds N]");
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(specPath, "utf8"));
const spec = doc.dive ?? doc;
const cfg = KP.specToConfig(spec);

/**
 * Greed of the proxy player. Matches the shipped game's own balance harness,
 * so a win rate printed here means the same thing as a win rate in the
 * game's difficulty table.
 */
const PROXY_GREED = 0.95;

/** One dive, played to the end by the engine's routing bot. */
function playOne(seed) {
  const s = KP.createDuel(cfg, seed, spec.playerRam);
  let guard = 0;

  // The engine mutates in place here rather than going through the reducer.
  // That is what the shipped harness does, and it skips 4000 state clones.
  while (s.phase === "playing" && guard++ < 4000) {
    if (s.turn === "player") {
      KP.botPlayTurn(s, "player", PROXY_GREED);
      if (s.phase === "playing" && s.turn === "player") KP.endPlayerTurn(s);
    } else {
      KP.oppStep(s);
    }
  }
  if (s.phase === "playing") throw new Error(`dive did not terminate on seed ${seed}`);

  return {
    won: s.phase === "won",
    kind: s.winKind,
    rounds: s.round,
    rotations: s.econ.player.rotations,
    par: s.par,
  };
}

let wins = 0;
const kinds = {};
let rounds = 0;
for (let seed = 1; seed <= SEEDS; seed++) {
  const r = playOne(seed);
  if (r.won) wins++;
  kinds[r.kind ?? "unresolved"] = (kinds[r.kind ?? "unresolved"] ?? 0) + 1;
  rounds += r.rounds;
}

const pct = (wins / SEEDS) * 100;
const target = spec.targetWinPct;
const drift = target != null ? pct - target : null;

console.log(`simulate: ${spec.id ?? path.basename(specPath)}  (${SEEDS} seeds)`);
console.log(`  grid ${spec.grid[0]}x${spec.grid[1]}, player RAM ${spec.playerRam}, opp RAM ${spec.oppRam}, greed ${spec.greed}, head start ${spec.headStart}`);
console.log(`  win rate    ${pct.toFixed(1)}%   (${wins}/${SEEDS})`);
if (target != null) {
  console.log(`  target      ${target}%   drift ${drift >= 0 ? "+" : ""}${drift.toFixed(1)}`);
}
console.log(`  avg rounds  ${(rounds / SEEDS).toFixed(1)}`);
console.log(`  endings     ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(", ")}`);

// A dive nobody can win, or nobody can lose, is not a dive. Those are the
// only two outcomes this refuses outright; drift against target is the
// Board Architect's problem to argue with, not a build failure.
if (wins === 0) {
  console.error("\nFAIL: unwinnable. 0 wins in every seed.");
  process.exit(1);
}
if (wins === SEEDS) {
  console.error("\nFAIL: uncontested. the reference player never lost.");
  process.exit(1);
}
if (target != null && Math.abs(drift) > 15) {
  console.error(`\nFAIL: ${Math.abs(drift).toFixed(1)} points off target. Re-run the board architect with this number.`);
  process.exit(1);
}
