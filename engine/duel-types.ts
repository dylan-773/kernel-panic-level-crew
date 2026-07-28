import { RngState } from "./rng";

/**
 * Flood-claim duel model, rotation only.
 *
 * The whole grid is pre-dealt with scrambled connector nodes. Rotating is
 * the only verb. Each side's signal floods live from its port through
 * aligned arms, auto-claiming every neutral node it touches, so one
 * rotation can cascade-claim a chain. Claimed territory persists and the
 * enemy flood can never pass through it. First flood to touch the core
 * wins.
 *
 * There are no programs, no modes, no traps, no locks, no wards, no
 * augments and no patch pieces in this engine. Rotating costs 1 RAM, RAM
 * refills each turn, and that is the entire economy.
 *
 * Arm masks and rotation semantics live in ./types
 * (0 north, 1 east, 2 south, 3 west; bit = 1 << dir).
 */

export type Side = "player" | "opp";

export function otherSide(s: Side): Side {
  return s === "player" ? "opp" : "player";
}

/** Connector distribution drawn at board generation. */
export const PIECE_I = 0b0101;
export const PIECE_L = 0b0011;
export const PIECE_T = 0b0111;
export const PIECE_X = 0b1111;

export type CellKind = "node" | "entryP" | "entryO" | "core" | "block";

export interface DuelCell {
  x: number;
  y: number;
  kind: CellKind;
  /** Arm mask at rotation 0. Slag blocks have 0. */
  base: number;
  rot: number;
  /** Cumulative quarter turns, for monotonic spin animation. */
  spin: number;
  /** Claimed territory. Ports are owned by their side; core stays "none". */
  owner: "none" | Side;
  /** Global claim sequence number (0 = never claimed), for ordering. */
  claimSeq: number;
  /** Position within the cascade that claimed it, for staggered animation. */
  claimWave: number;
}

export interface DuelPower {
  player: boolean[];
  opp: boolean[];
}

export interface DuelConfig {
  w: number;
  h: number;
  oppRam: number;
  /** 0..1 chance per rotation that the opponent plays optimally. */
  greed: number;
  /** Target route cost (rotation RAM) the board generator aims both sides at. */
  minCost: number;
  /** Hard floor on the player's opening route cost. Defaults to their RAM. */
  minPd?: number;
  /** Neutral nodes pre-claimed along the intrusion's route at dive start. */
  headStart: number;
  /** Override of the par margin's flat term (defaults to PAR_FLAT). */
  parFlat?: number;
  /** Slag density at board generation (defaults to 0.18). */
  slag?: number;
}

export type DuelPhase = "playing" | "won" | "lost";

/**
 * How the dive ended. "core" is a flood touching the core; "cap" is the
 * round-cap tiebreak; "severed" and "gridlock" are route verdicts, decided
 * without either flood arriving. The last two exist because calling them
 * "core" made a walled-off loss read as a bug.
 */
export type DuelEndKind = "core" | "cap" | "severed" | "gridlock";

export interface DuelFx {
  id: number;
  kind: string;
  /** Magnitude for scalable effects (cascade length). */
  n?: number;
}

/** One side's turn economy. */
export interface SideEcon {
  ramPerTurn: number;
  ram: number;
  carry: number;
  /** Max RAM carried between turns. */
  carryCap: number;
  /** RAM subtracted from the next turn's generation. Negative = a gain. */
  drainNext: number;
  /** Manual rotations this dive (the par meter). */
  rotations: number;
}

export interface DuelState {
  cfg: DuelConfig;
  seed: number;
  w: number;
  h: number;
  cells: DuelCell[];
  entryP: number;
  entryO: number;
  coreIdx: number;
  power: DuelPower;
  phase: DuelPhase;
  winKind: DuelEndKind | null;
  /** Why the dive ended, in the player's language. Set at finish. */
  endReason: string | null;
  /** 1-based; one round = one player turn then one opponent turn. */
  round: number;
  turn: Side;
  econ: Record<Side, SideEcon>;
  /** Human-readable line describing the opponent's likely next move. */
  oppNextIntent: string | null;
  /** Opponent route cost measured at duel start (progress readouts). */
  oppStartCost: number;
  /** Rotation budget for a clean win. A readout only. */
  par: number;
  /**
   * Consecutive round-ends where the player had no route to the core. The
   * severed verdict needs two, so a one-round planner blindspot cannot end
   * a dive that is still winnable.
   */
  severedStreak: number;
  rngState: RngState;
  claimCounter: number;
  fx: DuelFx[];
  fxNext: number;
  notice: { id: number; text: string } | null;
  /** Opponent turn bookkeeping, reset each opponent turn. */
  oppTurn: {
    started: boolean;
    /** Committed rotation queue for this turn, absolute target rotations. */
    queue: Array<{ idx: number; targetRot: number }>;
    replans: number;
    /** Route cost at the last replan; the next needs strict progress. */
    lastReplanCost: number;
    /**
     * Telegraph beat: the rotation the machine has locked in but not yet
     * made. The UI highlights it for one tick before it lands.
     */
    aim: { kind: "rotate"; idx: number } | null;
  };
}

export const ROUND_CAP = 25;
