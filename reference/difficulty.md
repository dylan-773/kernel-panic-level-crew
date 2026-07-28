# Difficulty calibration

Measured, not guessed. Every row is 200 seeds played by the engine's own
route-following bot at greed 0.95. Regenerate any row with:

```
node tools/simulate.mjs <spec.json> --seeds 200
```

These numbers describe the engine in `engine/` at its current state. They are
not transferable across engine changes: re-measure the table after any change
there, because every claim an agent makes cites these rows.

**The reference bot never wastes a rotation.** A human does. A dive that the
bot wins 55% of the time punishes every mistake a human makes; felt difficulty
sits well below the bot's number. The named bands below already include that
slack — do not "correct" for it again when picking numbers.

## What each knob does

| knob | range | effect |
|---|---|---|
| `grid` | `[w,h]`, odd | Bigger boards lengthen both routes, so up to `oppRam` 6 the win rate moves little and the dive just runs longer — the pacing lever. At `oppRam` 7-8 big boards start favoring SIG-0 (15x13 runs 10-17 points below 13x11), so past hard the grid is no longer difficulty-neutral. |
| `playerRam` | 4-9 | Rotations you get per turn. Leave at 5; every row below assumes it. |
| `oppRam` | 3-8 | Rotations SIG-0 gets. **The strongest lever.** One point is worth 7 to 20 points of win rate, biggest between 4 and 6. |
| `greed` | 0-1 | How often SIG-0 takes the planned rotation instead of fumbling into a random one. 0.85 is competent. Below 0.7 it visibly wanders. |
| `headStart` | 0-4 | Nodes pre-claimed along SIG-0's route before you link in. **The second strongest**, worth 20 to 30 points from 0 to 2, and it compounds with `oppRam` because it shortens SIG-0's route as well as handing it ground. It is also what makes a dive *feel* unforgiving — you start already behind. |
| `minCost` | int | Route length the generator aims both sides at. Roughly `2 x width` is achievable. A target, not a guarantee. |
| `minPd` | int | Floor on your opening route cost, so a lucky board is not closable in one turn. |
| `slag` | 0-0.3 | Dead-junction density. Carves the field into corridors. Past 0.25 boards start failing to generate. |
| `parFlat` | 0-6 | Flat term of the rotation budget readout. Cosmetic; the core decides the dive. |

## Measured table

All rows: `playerRam` 5, `greed` 0.85, `slag` 0.18, `minCost` = 2 x width,
`minPd` 8. Grouped by grid, best-for-the-player first.

| grid | oppRam | headStart | win rate | avg rounds |
|---|---|---|---|---|
| 9x7 | 4 | 0 | 90.0% | 2.9 |
| 9x7 | 5 | 0 | 80.0% | 2.9 |
| 9x7 | 6 | 0 | 71.0% | 2.6 |
| 9x7 | 4 | 2 | 65.0% | 2.6 |
| 9x7 | 7 | 0 | 64.0% | 2.3 |
| 9x7 | 4 | 3 | 59.0% | 2.5 |
| 9x7 | 8 | 0 | 55.5% | 2.1 |
| 9x7 | 5 | 2 | 54.5% | 2.4 |
| 9x7 | 5 | 3 | 47.0% | 2.1 |
| 9x7 | 6 | 2 | 42.5% | 2.0 |
| 9x7 | 6 | 3 | 35.0% | 1.9 |
| 9x7 | 7 | 2 | 35.0% | 1.8 |
| 9x7 | 7 | 3 | 30.0% | 1.7 |
| 9x7 | 8 | 2 | 29.5% | 1.7 |
| 9x7 | 8 | 3 | 24.0% | 1.6 |
| 11x9 | 4 | 0 | 94.5% | 3.9 |
| 11x9 | 5 | 0 | 87.5% | 3.7 |
| 11x9 | 4 | 2 | 77.5% | 3.6 |
| 11x9 | 6 | 0 | 71.0% | 3.5 |
| 11x9 | 4 | 3 | 64.0% | 3.3 |
| 11x9 | 7 | 0 | 61.0% | 3.3 |
| 11x9 | 5 | 2 | 57.5% | 3.4 |
| 11x9 | 8 | 0 | 51.5% | 3.4 |
| 11x9 | 5 | 3 | 43.0% | 2.9 |
| 11x9 | 6 | 2 | 41.0% | 3.0 |
| 11x9 | 7 | 2 | 34.5% | 2.5 |
| 11x9 | 6 | 3 | 30.5% | 2.6 |
| 11x9 | 7 | 3 | 26.5% | 2.5 |
| 11x9 | 8 | 2 | 26.5% | 2.4 |
| 11x9 | 8 | 3 | 19.5% | 2.1 |
| 13x11 | 4 | 0 | 96.0% | 4.6 |
| 13x11 | 5 | 0 | 86.5% | 4.4 |
| 13x11 | 4 | 2 | 85.0% | 4.2 |
| 13x11 | 4 | 3 | 79.0% | 4.2 |
| 13x11 | 6 | 0 | 74.5% | 4.1 |
| 13x11 | 5 | 2 | 68.5% | 4.0 |
| 13x11 | 5 | 3 | 58.0% | 3.8 |
| 13x11 | 7 | 0 | 57.5% | 3.8 |
| 13x11 | 6 | 2 | 55.0% | 3.8 |
| 13x11 | 8 | 0 | 48.0% | 3.6 |
| 13x11 | 6 | 3 | 39.0% | 3.4 |
| 13x11 | 7 | 2 | 37.5% | 3.4 |
| 13x11 | 7 | 3 | 26.5% | 3.2 |
| 13x11 | 8 | 2 | 26.5% | 3.3 |
| 13x11 | 8 | 3 | 22.5% | 3.1 |
| 15x13 | 4 | 0 | 87.0% | 4.4 |
| 15x13 | 5 | 0 | 81.0% | 4.4 |
| 15x13 | 4 | 2 | 75.5% | 4.1 |
| 15x13 | 4 | 3 | 71.0% | 4.2 |
| 15x13 | 5 | 2 | 65.5% | 4.0 |
| 15x13 | 6 | 0 | 64.0% | 3.9 |
| 15x13 | 5 | 3 | 57.0% | 3.9 |
| 15x13 | 7 | 0 | 43.5% | 3.7 |
| 15x13 | 6 | 2 | 41.0% | 3.6 |
| 15x13 | 6 | 3 | 33.5% | 3.3 |
| 15x13 | 8 | 0 | 31.0% | 3.4 |
| 15x13 | 7 | 2 | 25.5% | 3.2 |
| 15x13 | 7 | 3 | 19.5% | 2.8 |
| 15x13 | 8 | 2 | 19.0% | 2.7 |
| 15x13 | 8 | 3 | 16.5% | 2.5 |

Reading it: `oppRam` and `headStart` do essentially all the work and they
compound. Grid size mostly moves the round count, which makes it the pacing
lever — except at `oppRam` 7+, where the biggest boards also tilt toward
SIG-0.

## Named difficulties

Bands are **bot** win rates. They sit deliberately high because the bot plays
near-optimally; the human experience of each band is roughly one notch harder.

| name | target win rate | reach it with |
|---|---|---|
| `easy` | 85-95% | `oppRam` 4-5, `headStart` 0 |
| `normal` | 60-75% | `oppRam` 5-6, `headStart` 0 — or `oppRam` 5, `headStart` 2 on 13x11+ |
| `hard` | 40-55% | `oppRam` 6-7, `headStart` 2 |
| `brutal` | 18-32% | `oppRam` 7-8, `headStart` 2-3 |

`normal` is the band that must tolerate mistakes: prefer `headStart` 0 there,
because starting already behind is what reads as merciless even when the win
rate says otherwise. Save `headStart` for `hard` and up, where feeling behind
is the point.

A dive that measures more than 15 points off its claimed target fails the
simulator. That is a wide band on purpose: board generation is stochastic and
the designer is expected to argue a number, not hit it exactly.

## Rounds

Dives run **2 to 5 rounds**, tracking grid size far more than pressure: 9x7
lands near 2, 11x9 near 3, 13x11 and 15x13 near 4. Under 2 is over before the
player has read the board; the simulator does not fail on it, but the gate
should raise it. If a dive needs to breathe, the lever is a bigger board, not
a weaker opponent.
