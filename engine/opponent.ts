import { applyRotate, emit, endOppTurn, roll } from "./duel-actions";
import { canRotate, routeCost, routePlan } from "./duel-power";
import { DuelState, Side } from "./duel-types";

/**
 * The scripted opponent. It plans with the same rotation-cost Dijkstra the
 * board generator uses and aligns junctions reach-outward along the
 * cheapest route to the core. One visible move per oppStep.
 *
 * `greed` is its only personality: the chance it takes the planned rotation
 * instead of fumbling into a random reachable one.
 */

interface QueueEntry {
  idx: number;
  targetRot: number;
}

function buildQueue(s: DuelState, side: Side): QueueEntry[] {
  const plan = routePlan(s, side);
  if (!plan) return [];
  return plan.steps.map((p) => ({ idx: p.idx, targetRot: p.targetRot }));
}

function computeIntent(s: DuelState): void {
  const cost = routeCost(s, "opp");
  if (!isFinite(cost)) s.oppNextIntent = "Probing for a route";
  else if (cost <= 3) s.oppNextIntent = "FINAL APPROACH to the core";
  else s.oppNextIntent = "Aligning junctions toward the core";
}

/**
 * Choose the next rotation from a committed queue WITHOUT applying it.
 * Returns the cell index, or -1 when the turn has nothing left. `replan`
 * must implement a cost-improvement guard, or a blindspot route would
 * burn RAM in cycles. Fumble rolls happen here, at pick time.
 */
function pickFromQueue(
  s: DuelState,
  side: Side,
  queue: QueueEntry[],
  greed: number,
  replan: () => void,
): number {
  const econ = s.econ[side];
  if (econ.ram < 1) return -1;

  while (queue.length > 0 && s.cells[queue[0].idx].rot === queue[0].targetRot) queue.shift();
  let head = queue[0];
  if (!head) {
    replan();
    while (queue.length > 0 && s.cells[queue[0].idx].rot === queue[0].targetRot) queue.shift();
    head = queue[0];
    if (!head) return -1;
  }
  if (!canRotate(s, side, head.idx)) {
    // Claimed out from under us: rebuild from scratch.
    queue.length = 0;
    replan();
    while (queue.length > 0 && s.cells[queue[0].idx].rot === queue[0].targetRot) queue.shift();
    head = queue[0];
    if (!head || !canRotate(s, side, head.idx)) return -1;
  }

  if (roll(s) >= greed) {
    // Fumble: twist a random reachable node instead; the queue stands.
    const pool = s.cells
      .map((_, i) => i)
      .filter((i) => i !== head.idx && canRotate(s, side, i) && s.cells[i].owner === "none");
    if (pool.length > 0) {
      return pool[Math.floor(roll(s) * pool.length)];
    }
  }
  return head.idx;
}

/** Pick and apply in one beat: the balance harness's proxy-player path. */
function queueRotateStep(
  s: DuelState,
  side: Side,
  queue: QueueEntry[],
  greed: number,
  replan: () => void,
): boolean {
  const idx = pickFromQueue(s, side, queue, greed, replan);
  if (idx === -1) return false;
  return applyRotate(s, side, idx);
}

interface ReplanMem {
  n: number;
  lastCost: number;
}

/** Replanner with a strict-progress guard against planner blindspots. */
function makeReplanner(s: DuelState, side: Side, queue: QueueEntry[], mem: ReplanMem) {
  return () => {
    if (mem.n <= 0) return;
    const cost = routeCost(s, side);
    if (!(cost < mem.lastCost)) {
      // No strict progress since the previous replan: stop feeding a cycle.
      return;
    }
    mem.lastCost = cost;
    mem.n--;
    queue.length = 0;
    queue.push(...buildQueue(s, side));
  };
}

/**
 * Play one whole turn for a side with the committed-queue bot. Used by the
 * balance harness as the proxy player. Does not end the turn.
 */
export function botPlayTurn(s: DuelState, side: Side, greed: number): void {
  const queue = buildQueue(s, side);
  const mem: ReplanMem = { n: 3, lastCost: Infinity };
  const replan = makeReplanner(s, side, queue, mem);
  let guard = 0;
  while (s.phase === "playing" && s.turn === side && s.econ[side].ram >= 1 && guard++ < 40) {
    if (!queueRotateStep(s, side, queue, greed, replan)) break;
  }
}

/** Perform one opponent move. Ends the opponent turn when nothing is left. */
export function oppStep(s: DuelState): void {
  if (s.phase !== "playing" || s.turn !== "opp") return;
  const ot = s.oppTurn;

  if (!ot.started) {
    ot.started = true;
    computeIntent(s);
    ot.queue = buildQueue(s, "opp");
    return; // one visible "thinking" beat
  }

  // A telegraphed move lands one beat after it was shown.
  if (ot.aim) {
    const aim = ot.aim;
    ot.aim = null;
    if (canRotate(s, "opp", aim.idx) && s.econ.opp.ram >= 1) {
      applyRotate(s, "opp", aim.idx);
      return;
    }
    // The aimed junction was stolen between beats; fall through and replan.
  }

  const mem: ReplanMem = { n: ot.replans, lastCost: ot.lastReplanCost };
  const replan = makeReplanner(s, "opp", ot.queue, mem);
  const idx = pickFromQueue(s, "opp", ot.queue, s.cfg.greed, replan);
  ot.replans = mem.n;
  ot.lastReplanCost = mem.lastCost;
  if (idx !== -1) {
    ot.aim = { kind: "rotate", idx };
    emit(s, "oppAim", idx);
    return;
  }

  endOppTurn(s);
}
