/**
 * Bundle entry. Hangs the engine's public surface off globalThis as `KP` so
 * the built file works as a plain <script> with no module loader, which is
 * what lets a generated dive open straight from the filesystem.
 *
 * Build:
 *   bun build engine/browser-entry.ts --outfile=play/engine.bundle.js \
 *     --format=iife --target=browser --minify
 */

import { createDuel } from "./duel-setup";
import { duelReducer } from "./duel-reducer";
import { canRotate, routeCost } from "./duel-power";
import { endPlayerTurn } from "./duel-actions";
import { botPlayTurn, oppStep } from "./opponent";
import { rotateArms } from "./types";
import { ROUND_CAP, BASE_KIT } from "./duel-types";
import { specToConfig } from "./index";

(globalThis as unknown as { KP: unknown }).KP = {
  createDuel,
  duelReducer,
  canRotate,
  routeCost,
  rotateArms,
  specToConfig,
  ROUND_CAP,
  BASE_KIT,
  // Used by the simulator, not the browser. botPlayTurn is the engine's own
  // routing bot; running it on the player side is exactly how the shipped
  // game calibrates its difficulty curve, so our win rates are comparable to
  // the game's published numbers rather than to a bot we invented.
  botPlayTurn,
  oppStep,
  endPlayerTurn,
};
