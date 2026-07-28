import { PAR_FLAT, PAR_RATE } from "./constants";
import { computeDuelPower, routeCost, routePlan, runFlood } from "./duel-power";
import {
  DuelCell,
  DuelConfig,
  DuelState,
  PIECE_I,
  PIECE_L,
  PIECE_T,
  PIECE_X,
  SideEcon,
} from "./duel-types";
import { Rng, seedRng } from "./rng";
import { cellIndex } from "./types";

/** Most nodes either flood can be handed for free before anyone moves. */
export const MAX_OPENING_CLAIM = 3;

/**
 * Mostly two-arm pipe (corners and straights): each junction demands a real
 * orientation choice, random boards stay subcritical (no runaway free
 * chains), and route costs land in a usable band. Tees and crosses are
 * rare gifts.
 */
function drawMask(rng: Rng): number {
  const v = rng.next();
  if (v < 0.4) return PIECE_I;
  if (v < 0.85) return PIECE_L;
  if (v < 0.97) return PIECE_T;
  return PIECE_X;
}

function initialEcon(ramPerTurn: number, carryCap: number): SideEcon {
  return {
    ramPerTurn,
    ram: 0,
    carry: 0,
    carryCap,
    drainNext: 0,
    rotations: 0,
  };
}

function buildCells(cfg: DuelConfig, rng: Rng): {
  cells: DuelCell[];
  entryP: number;
  entryO: number;
  coreIdx: number;
} {
  const { w, h } = cfg;
  const midY = Math.floor(h / 2);
  const entryP = cellIndex(w, 0, midY);
  const entryO = cellIndex(w, w - 1, midY);
  const coreIdx = cellIndex(w, Math.floor(w / 2), midY);
  const near = (i: number, j: number): number => {
    const ax = i % w;
    const ay = Math.floor(i / w);
    const bx = j % w;
    const by = Math.floor(j / w);
    return Math.abs(ax - bx) + Math.abs(ay - by);
  };

  const cells: DuelCell[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = cellIndex(w, x, y);
      const protectedCell =
        i === entryP || i === entryO || i === coreIdx ||
        near(i, entryP) < 2 || near(i, entryO) < 2 || near(i, coreIdx) < 2;
      const slag = !protectedCell && rng.next() < (cfg.slag ?? 0.18);
      cells.push({
        x,
        y,
        kind: slag ? "block" : "node",
        base: slag ? 0 : drawMask(rng),
        rot: slag ? 0 : rng.int(4),
        spin: 0,
        owner: "none",
        claimSeq: 0,
        claimWave: 0,
      });
    }
  }
  cells[entryP].kind = "entryP";
  cells[entryP].base = 0b0111; // N+E+S
  cells[entryP].rot = 0;
  cells[entryP].owner = "player";
  cells[entryO].kind = "entryO";
  cells[entryO].base = 0b1101; // N+S+W
  cells[entryO].rot = 0;
  cells[entryO].owner = "opp";
  cells[coreIdx].kind = "core";
  cells[coreIdx].base = 0b1111;
  cells[coreIdx].rot = 0;
  cells[coreIdx].owner = "none";
  for (const c of cells) c.spin = c.rot;
  return { cells, entryP, entryO, coreIdx };
}

/**
 * Generate the dive: reject boards until both sides' rotation-cost routes
 * are finite, close in cost, near the target, and neither side's opening
 * flood grabs more than a toehold. The intrusion's head start is applied
 * afterwards: its first nodes arrive pre-claimed and pre-aligned.
 */
export function createDuel(
  cfg: DuelConfig,
  seed: number,
  playerRamPerTurn: number,
  retry = 0,
): DuelState {
  const rng = new Rng(seed ^ 0x2545f491);
  const carryCap = 2;
  let best: DuelState | null = null;
  let bestScore = Infinity;
  let loose: DuelState | null = null;
  let looseScore = Infinity;
  // Any fairness-passing board at all: the graceful floor when a rare seed
  // cannot meet minPd.
  let anyFair: DuelState | null = null;
  let anyFairScore = Infinity;

  for (let attempt = 0; attempt < 160; attempt++) {
    const { cells, entryP, entryO, coreIdx } = buildCells(cfg, rng);
    const s: DuelState = {
      cfg,
      seed,
      w: cfg.w,
      h: cfg.h,
      cells,
      entryP,
      entryO,
      coreIdx,
      power: { player: [], opp: [] },
      phase: "playing",
      winKind: null,
      endReason: null,
      round: 1,
      turn: "player",
      econ: { player: initialEcon(playerRamPerTurn, carryCap), opp: initialEcon(cfg.oppRam, 2) },
      oppNextIntent: null,
      oppStartCost: 0,
      par: 0,
      severedStreak: 0,
      rngState: seedRng(seed ^ 0x5f3759df),
      claimCounter: 0,
      fx: [],
      fxNext: 1,
      notice: null,
      oppTurn: { started: false, queue: [], replans: 3, lastReplanCost: Infinity, aim: null },
    };

    // Opening floods: whatever happens to align claims a toehold.
    const fp = runFlood(s, "player");
    const fo = runFlood(s, "opp");
    if (fp.reachedCore || fo.reachedCore) continue;
    if (fp.claimed.length > MAX_OPENING_CLAIM || fo.claimed.length > MAX_OPENING_CLAIM) continue;

    const pd = routeCost(s, "player");
    const od = routeCost(s, "opp");
    if (!isFinite(pd) || !isFinite(od)) continue;
    if (Math.abs(pd - od) > 2) continue;

    const shorter = Math.min(pd, od);
    const score = Math.abs(shorter - cfg.minCost);

    // A configured minPd is close to a guarantee: loose gives it 2 slack,
    // and only a seed that cannot manage even that ships an unfloored
    // board (anyFair), rather than crashing board generation outright.
    const looseOk = pd > Math.max(playerRamPerTurn, (cfg.minPd ?? 0) - 2);
    if (looseOk && score < looseScore) {
      looseScore = score;
      loose = s;
    }
    if (score < anyFairScore) {
      anyFairScore = score;
      anyFair = s;
    }

    // Nobody may be able to win on their opening turn.
    const pdFloor = Math.max(playerRamPerTurn, cfg.minPd ?? 0);
    if (pd <= pdFloor || od <= cfg.oppRam) continue;

    if (score < bestScore) {
      bestScore = score;
      best = s;
      if (score <= 1) break;
    }
  }

  let s = best ?? loose;
  if (!s) {
    // A floored config gets a much deeper retry budget: its floor is the
    // whole point, and an unfloored board is the last thing we ship.
    const maxRetry = cfg.minPd !== undefined ? 12 : 5;
    if (retry >= maxRetry) {
      if (anyFair) {
        s = anyFair;
      } else if (cfg.minPd !== undefined) {
        // The floor is unmeetable on this seed line: fall back to the
        // pre-floor generator rather than dying. Rare by construction.
        return createDuel({ ...cfg, minPd: undefined }, seed, playerRamPerTurn, 0);
      } else {
        throw new Error("dive generator could not produce a fair board");
      }
    } else {
      return createDuel(cfg, (seed + 0x9e37) >>> 0, playerRamPerTurn, retry + 1);
    }
  }

  // Head start: the intrusion is already inside, pre-aligned along its
  // route. Enemy territory is impassable to the player and the fairness
  // checks ran BEFORE these claims, so every step re-verifies the player
  // still has a route; a claim that walls them off gets peeled back, and
  // if the settling flood walls them off, the whole head start is undone.
  if (cfg.headStart > 0) {
    const applied: Array<{ idx: number; rot: number; spin: number }> = [];
    for (let k = 0; k < cfg.headStart; k++) {
      const plan = routePlan(s, "opp");
      if (!plan) break;
      const next = plan.path.find((p) => s.cells[p.idx].owner === "none");
      if (!next) break;
      const c = s.cells[next.idx];
      // Never hand the machine the core-adjacent cell as a freebie.
      const core = s.cells[s.coreIdx];
      if (Math.abs(c.x - core.x) + Math.abs(c.y - core.y) <= 1) break;
      const prev = { idx: next.idx, rot: c.rot, spin: c.spin };
      const turns = (next.targetRot - c.rot + 4) % 4;
      c.rot = next.targetRot;
      c.spin += turns;
      c.owner = "opp";
      c.claimSeq = ++s.claimCounter;
      c.claimWave = 0;
      if (!isFinite(routeCost(s, "player"))) {
        c.rot = prev.rot;
        c.spin = prev.spin;
        c.owner = "none";
        c.claimSeq = 0;
        break;
      }
      applied.push(prev);
    }
    const flood = runFlood(s, "opp");
    if (!isFinite(routeCost(s, "player"))) {
      // The opening cascade sealed the player's corridor: revert to the
      // validated pre-head-start board (claims AND alignments).
      for (const i of flood.claimed) {
        s.cells[i].owner = "none";
        s.cells[i].claimSeq = 0;
      }
      for (const u of [...applied].reverse()) {
        const c = s.cells[u.idx];
        c.rot = u.rot;
        c.spin = u.spin;
        c.owner = "none";
        c.claimSeq = 0;
      }
    }
  }

  {
    const rc = routeCost(s, "opp");
    s.oppStartCost = Math.max(1, isFinite(rc) ? rc : cfg.minCost);
  }
  {
    // Par is set once, from the starting board the player actually faces
    // (head start applied): the honest route cost plus a working margin.
    const pd = routeCost(s, "player");
    const base = isFinite(pd) ? pd : cfg.minCost;
    s.par = Math.ceil(base * PAR_RATE) + (cfg.parFlat ?? PAR_FLAT);
  }
  s.power = computeDuelPower(s);
  s.econ.player.ram = playerRamPerTurn;
  return s;
}
