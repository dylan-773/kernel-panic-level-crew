/**
 * The dive engine's public surface.
 *
 * A dive is a grid of scrambled junctions, RAM, and turns. Rotating a
 * junction costs 1 RAM. Your signal floods through aligned arms and claims
 * every neutral node it reaches. First flood to the core wins.
 *
 * There is no program layer in this engine. Not disabled, not configured
 * off: absent. There is no code here that plants a trap, casts a mode,
 * locks a junction or spends an augment, so no configuration can produce
 * one. `tools/check_bare.mjs` enforces that on every run.
 */

export { createDuel } from "./duel-setup";
export { duelReducer, type DuelAction } from "./duel-reducer";
export { canRotate, routeCost } from "./duel-power";
export { botPlayTurn, oppStep } from "./opponent";
export { endPlayerTurn } from "./duel-actions";
export { rotateArms } from "./types";
export { ROUND_CAP } from "./duel-types";
export type {
  DuelCell,
  DuelConfig,
  DuelState,
  DuelEndKind,
  Side,
} from "./duel-types";

import type { DuelConfig } from "./duel-types";

/**
 * A crew-authored dive spec. Every field is something a rotation race can
 * feel; there is nothing else to express.
 */
export interface DiveSpec {
  id: string;
  difficulty: string;
  seed?: number;
  grid: [number, number];
  playerRam: number;
  oppRam: number;
  greed: number;
  minCost: number;
  minPd?: number;
  headStart: number;
  slag: number;
  parFlat: number;
  targetWinPct: number;
}

export function specToConfig(spec: DiveSpec): DuelConfig {
  return {
    w: spec.grid[0],
    h: spec.grid[1],
    oppRam: spec.oppRam,
    greed: spec.greed,
    minCost: spec.minCost,
    minPd: spec.minPd,
    headStart: spec.headStart,
    parFlat: spec.parFlat,
    slag: spec.slag,
  };
}
