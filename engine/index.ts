/**
 * The dive engine's public surface.
 *
 * This is the real Kernel Panic duel engine, vendored whole. A dive here is
 * the engine running with every program turned off: the crew always emits
 * abilityFreq 0 and the player always carries BASE_KIT, so neither side can
 * cast anything and the whole dive collapses to what it is underneath. You
 * rotate junctions, your signal floods through aligned arms and claims every
 * neutral node it reaches, and the first flood to touch the core wins.
 *
 * Rotating costs 1 RAM. RAM refills each turn. That is the entire economy.
 */

export { createDuel } from "./duel-setup";
export { duelReducer, type DuelAction } from "./duel-reducer";
export { canRotate, routeCost } from "./duel-power";
export { rotateArms } from "./types";
export { ROUND_CAP, BASE_KIT } from "./duel-types";
export type {
  DuelCell,
  DuelConfig,
  DuelKit,
  DuelState,
  DuelEndKind,
  Side,
} from "./duel-types";

import type { DuelConfig } from "./duel-types";

/**
 * Turn a crew-authored dive spec into a DuelConfig.
 *
 * The spec carries only the knobs a rotation race can feel. Everything the
 * program layer would need is pinned here to the values that switch it off,
 * so a malformed spec cannot accidentally hand the intrusion an ability.
 */
export interface DiveSpec {
  id: string;
  difficulty: string;
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
    // Hard zero. No program ever fires on either side of a dive.
    abilityFreq: 0,
    minCost: spec.minCost,
    minPd: spec.minPd,
    headStart: spec.headStart,
    oppAttackModes: ["redirect"],
    oppDefendModes: [],
    oppTier: 1,
    dominant: "redirect",
    parFlat: spec.parFlat,
    slag: spec.slag,
  };
}
