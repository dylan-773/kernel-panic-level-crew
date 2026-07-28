/**
 * Every tunable the rotation race has. There is no program layer here, so
 * there are no widths, tiers, mode tables or augment definitions.
 */

/** Neutral junctions within this many steps of your territory can be rotated. */
export const BASE_REACH = 2;

/**
 * Par: the rotation budget for a clean dive, computed at board generation
 * from the starting route cost. A readout, not a rule. Nothing is won or
 * lost by it; the core decides the dive.
 */
export const PAR_RATE = 1.25;
export const PAR_FLAT = 2;

/**
 * Cascade payoff: +1 RAM per 4 nodes claimed in one settle, capped, and
 * BANKED into the next turn. Paying it out immediately compounds into a
 * degenerate snowball where the whole route finishes in a turn; banked, it
 * is pure tempo you feel on the very next cycle.
 */
export function cascadeRam(claimed: number): number {
  return Math.min(2, Math.floor(claimed / 4));
}
