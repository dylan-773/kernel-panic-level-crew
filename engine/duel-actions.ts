import { cascadeRam } from "./constants";
import { computeDuelPower, routeCost, runFlood } from "./duel-power";
import { DuelEndKind, DuelState, ROUND_CAP, Side, otherSide } from "./duel-types";
import { nextU32 } from "./rng";

/**
 * Shared state-mutation helpers. Both sides play by exactly these rules;
 * the reducer validates player input and the opponent planner picks moves,
 * but resolution lives here.
 *
 * There is one action: rotate. Everything else is turn bookkeeping.
 */

export function emit(s: DuelState, kind: string, n?: number): void {
  s.fx.push({ id: s.fxNext++, kind, n });
}

export function say(s: DuelState, text: string): void {
  s.notice = { id: s.fxNext++, text };
}

export function roll(s: DuelState): number {
  const [v, next] = nextU32(s.rngState);
  s.rngState = next;
  return v;
}

/**
 * End the dive. `reason` is the player-facing sentence for the result
 * overlay; it survives on state because the toast is cleared here (a
 * 2.4 second toast cannot carry the one line that explains the loss).
 */
export function finishDuel(
  s: DuelState,
  winner: Side,
  kind: DuelEndKind,
  reason?: string,
): void {
  s.phase = winner === "player" ? "won" : "lost";
  s.winKind = kind;
  if (reason) s.endReason = reason;
  s.notice = null;
  emit(s, winner === "player" ? "win" : "lose");
}

/**
 * Re-run both floods after a board change, acting side first (its claims
 * and win take priority). Cascades bank RAM into the next turn.
 */
export function settleFloods(s: DuelState, acting: Side): void {
  for (const side of [acting, otherSide(acting)] as Side[]) {
    if (s.phase !== "playing") break;
    const f = runFlood(s, side);
    // Side-tagged: an untagged "cascade" rendered the machine eating half
    // the board as a green win banner on the player's screen.
    const mine = side === "player";
    if (f.claimed.length >= 3) {
      emit(s, mine ? "cascade" : "cascadeOpp", f.claimed.length);
    } else if (f.claimed.length > 0) {
      emit(s, mine ? "claim" : "claimOpp", f.claimed.length);
    }

    // Cascades bank RAM for the next turn: the chain you set up buys the
    // tempo to keep pushing, without compounding inside one turn.
    const bonus = cascadeRam(f.claimed.length);
    if (bonus > 0) {
      s.econ[side].drainNext -= bonus;
      emit(s, mine ? "cascadeRam" : "cascadeRamOpp", bonus);
    }

    if (f.reachedCore) {
      finishDuel(
        s,
        side,
        "core",
        side === "player"
          ? "Your flood touched the core first. The intrusion collapses."
          : "Its flood reached the core before yours did.",
      );
    }
  }
  s.power = computeDuelPower(s);
}

/** Rotate a node one quarter turn for `side`; returns false when denied. */
export function applyRotate(s: DuelState, side: Side, idx: number): boolean {
  const econ = s.econ[side];
  if (econ.ram < 1) return false;
  const c = s.cells[idx];
  c.rot = (c.rot + 1) % 4;
  c.spin += 1;
  econ.ram -= 1;
  econ.rotations += 1;
  emit(s, "rotate");
  settleFloods(s, side);
  return true;
}

function beginTurnEconomy(s: DuelState, side: Side): void {
  const econ = s.econ[side];
  const ram = econ.ramPerTurn + econ.carry - econ.drainNext;
  econ.drainNext = 0;
  econ.ram = Math.max(0, ram);
  econ.carry = 0;
}

export function startOppTurn(s: DuelState): void {
  s.turn = "opp";
  s.oppTurn = { started: false, queue: [], replans: 3, lastReplanCost: Infinity, aim: null };
  beginTurnEconomy(s, "opp");
}

/** Can the player still reach the core at all? */
export function playerHasRoute(s: DuelState): boolean {
  return isFinite(routeCost(s, "player"));
}

export function endOppTurn(s: DuelState): void {
  if (s.phase !== "playing") return;
  const econ = s.econ.opp;
  econ.carry = Math.min(econ.carryCap, Math.max(0, econ.ram));
  s.round++;

  if (s.round > ROUND_CAP) {
    const pd = routeCost(s, "player");
    const od = routeCost(s, "opp");
    const playerCloser = pd <= od;
    finishDuel(
      s,
      playerCloser ? "player" : "opp",
      "cap",
      playerCloser
        ? "The link timed out with your route closer to the core than its. It counts, barely."
        : "The link timed out with its route closer to the core than yours.",
    );
    return;
  }

  // A walled-off player is already beaten, so the dive is called here rather
  // than marched to the cap. The verdict has to repeat on the next round
  // before it counts, so a one-round planner blindspot cannot end a dive
  // that is still winnable.
  if (!playerHasRoute(s)) {
    s.severedStreak++;
    if (s.severedStreak >= 2) {
      if (isFinite(routeCost(s, "opp"))) {
        finishDuel(
          s,
          "opp",
          "severed",
          "SEVERED. Its territory walls your port off from the core. No rotation opens a route, so the link is already lost.",
        );
      } else {
        finishDuel(
          s,
          "player",
          "gridlock",
          "Total gridlock. Neither signal can reach the core. The link collapses in your favor.",
        );
      }
      return;
    }
    say(s, "ROUTE LOST. No path from your port to the core. Open one this turn or the link is called.");
  } else {
    s.severedStreak = 0;
  }

  s.turn = "player";
  beginTurnEconomy(s, "player");
}

export function endPlayerTurn(s: DuelState): void {
  if (s.phase !== "playing") return;
  const econ = s.econ.player;
  econ.carry = Math.min(econ.carryCap, Math.max(0, econ.ram));
  emit(s, "endTurn");
  startOppTurn(s);
}
