import { applyRotate, emit, endPlayerTurn, say } from "./duel-actions";
import { canRotate } from "./duel-power";
import { DuelState } from "./duel-types";
import { oppStep } from "./opponent";

/**
 * Pure reducer for the dive: clone, mutate through the shared helpers,
 * queue fx in-state, drain explicitly. Fully turn-based; the only recurring
 * dispatch is oppStep on a short UI interval.
 *
 * Two player actions exist. There is no third.
 */

export type DuelAction =
  | { type: "rotate"; idx: number }
  | { type: "endTurn" }
  | { type: "oppStep" }
  | { type: "fxDrain"; upTo: number };

function cloneState(s: DuelState): DuelState {
  return {
    ...s,
    cells: s.cells.map((c) => ({ ...c })),
    econ: {
      player: { ...s.econ.player },
      opp: { ...s.econ.opp },
    },
    oppTurn: { ...s.oppTurn, queue: [...s.oppTurn.queue] },
    fx: [...s.fx],
  };
}

function playerCanAct(s: DuelState): boolean {
  return s.phase === "playing" && s.turn === "player";
}

function deny(s: DuelState, msg?: string): DuelState {
  emit(s, "deny");
  if (msg) say(s, msg);
  return s;
}

export function duelReducer(state: DuelState, action: DuelAction): DuelState {
  switch (action.type) {
    case "fxDrain": {
      if (state.fx.length === 0) return state;
      return { ...state, fx: state.fx.filter((e) => e.id > action.upTo) };
    }

    case "rotate": {
      if (!playerCanAct(state)) return state;
      const s = cloneState(state);
      if (s.econ.player.ram < 1) return deny(s, "No RAM left. End the turn.");
      if (!canRotate(s, "player", action.idx)) {
        const c = s.cells[action.idx];
        if (c && c.kind === "node" && c.owner === "opp") {
          return deny(s, "Enemy territory. You cannot turn what its signal already holds.");
        }
        return deny(s, "Out of reach. Work outward from your territory.");
      }
      applyRotate(s, "player", action.idx);
      return s;
    }

    case "endTurn": {
      if (!playerCanAct(state)) return state;
      const s = cloneState(state);
      endPlayerTurn(s);
      return s;
    }

    case "oppStep": {
      if (state.phase !== "playing" || state.turn !== "opp") return state;
      const s = cloneState(state);
      oppStep(s);
      return s;
    }
  }
}
