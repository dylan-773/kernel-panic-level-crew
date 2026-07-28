# Difficulty calibration

Measured, not guessed. Every row is 150 seeds played by the engine's own
route-following bot at greed 0.95. Regenerate any row with:

```
node tools/simulate.mjs <spec.json> --seeds 200
```

**These numbers describe the bare engine**, the one in `engine/`, where the
only move is a rotation. They are not transferable from any build that had a
program layer: an earlier table measured with the intrusion still able to cast
read 10 to 15 points lower on every row.

## What each knob does

| knob | range | effect |
|---|---|---|
| `grid` | `[w,h]`, odd | The board. Bigger boards lengthen both routes at once, so the win rate barely moves, but the dive runs longer. Reach for it to change pacing, not difficulty. |
| `playerRam` | 4-9 | Rotations you get per turn. Leave at 5 unless the brief says otherwise; every row below assumes it. |
| `oppRam` | 3-8 | Rotations SIG-0 gets. **The strongest lever.** One point is worth 10 to 20 points of win rate. |
| `greed` | 0-1 | How often SIG-0 takes the planned rotation instead of fumbling into a random one. 0.85 is competent. Below 0.7 it visibly wanders. |
| `headStart` | 0-4 | Nodes pre-claimed along SIG-0's route before you link in. **The second strongest**, worth 20 to 30 points from 0 to 2, and it compounds with `oppRam` because it shortens SIG-0's route as well as handing it ground. |
| `minCost` | int | Route length the generator aims both sides at. Roughly `2 x width` is achievable. A target, not a guarantee. |
| `minPd` | int | Floor on your opening route cost, so a lucky board is not closable in one turn. |
| `slag` | 0-0.3 | Dead-junction density. Carves the field into corridors. Past 0.25 boards start failing to generate. |
| `parFlat` | 0-6 | Flat term of the rotation budget readout. Cosmetic; the core decides the dive. |

## Measured table

All rows: `playerRam` 5, `greed` 0.85, `slag` 0.18, `minCost` = 2 x width.

| grid | oppRam | headStart | win rate | avg rounds |
|---|---|---|---|---|
| 13x11 | 4 | 0 | 98.0% | 3.1 |
| 9x7 | 4 | 0 | 97.3% | 2.2 |
| 11x9 | 4 | 0 | 96.0% | 2.8 |
| 13x11 | 5 | 0 | 89.3% | 3.1 |
| 11x9 | 5 | 0 | 88.0% | 2.7 |
| 13x11 | 4 | 2 | 87.3% | 3.0 |
| 9x7 | 5 | 0 | 86.7% | 2.2 |
| 11x9 | 4 | 2 | 76.7% | 2.6 |
| 9x7 | 6 | 0 | 77.3% | 2.1 |
| 13x11 | 6 | 0 | 73.3% | 2.9 |
| 11x9 | 6 | 0 | 72.0% | 2.5 |
| 9x7 | 4 | 2 | 70.0% | 2.0 |
| 13x11 | 5 | 2 | 68.7% | 2.9 |
| 15x13 | 5 | 2 | 67.3% | 3.2 |
| 9x7 | 5 | 2 | 54.7% | 1.9 |
| 11x9 | 5 | 2 | 54.0% | 2.4 |
| 13x11 | 6 | 2 | 49.3% | 2.6 |
| 9x7 | 6 | 2 | 43.3% | 1.7 |
| 11x9 | 6 | 2 | 40.7% | 2.2 |
| 15x13 | 6 | 2 | 40.0% | 2.9 |
| 13x11 | 7 | 2 | 32.0% | 2.3 |
| 11x9 | 7 | 2 | 30.7% | 2.0 |
| 11x9 | 7 | 3 | 22.0% | 1.8 |
| 13x11 | 7 | 3 | 20.7% | 2.2 |
| 11x9 | 8 | 3 | 16.0% | 1.6 |
| 15x13 | 7 | 3 | 14.7% | 2.4 |
| 13x11 | 8 | 3 | 14.0% | 2.0 |
| 13x11 | 8 | 4 | 9.3% | 1.8 |

Reading it: `oppRam` and `headStart` do essentially all the work and they
compound. Grid size moves the win rate very little but moves the round count a
lot, which makes it the pacing lever rather than the difficulty lever.

## Named difficulties

| name | target win rate | reach it with |
|---|---|---|
| `easy` | 75-90% | `oppRam` 4-5, `headStart` 0 |
| `normal` | 45-60% | `oppRam` 5-6, `headStart` 2 |
| `hard` | 28-40% | `oppRam` 6-7, `headStart` 2 |
| `brutal` | 10-22% | `oppRam` 7-8, `headStart` 3-4 |

A dive that measures more than 15 points off its claimed target fails the
simulator. That is a wide band on purpose: board generation is stochastic and
the architect is expected to argue a number, not hit it exactly.

## Rounds

Dives run **2 to 4 rounds**. Under 2 is over before the player has read the
board; the simulator does not fail on it, but the gate should raise it.

Rounds track grid size far more than difficulty: 9x7 lands near 2.0 regardless
of pressure, 13x11 near 2.9, 15x13 near 3.0. If a dive needs to breathe, the
lever is a bigger board, not a weaker opponent.
