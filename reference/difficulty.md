# Difficulty calibration

Measured, not guessed. Every row below is 120 seeds played by the engine's own
routing bot at greed 0.95, which is the same proxy the shipped game uses to
calibrate its difficulty curve. Rebuild this table any time the engine changes:

```
node tools/simulate.mjs <spec.json> --seeds 200
```

## What each knob does

| knob | range | effect |
|---|---|---|
| `grid` | `[w,h]`, odd | The board. Bigger boards mean longer routes for both sides and slightly favour the player, who gets more room to work outward. The silhouette of the dive. |
| `playerRam` | 4-9 | Rotations you get per turn. The shipped game starts a diver at 5. |
| `oppRam` | 3-8 | Rotations SIG-0 gets per turn. **The strongest lever in the file.** One point is worth roughly 15 to 20 points of win rate. |
| `greed` | 0-1 | How often SIG-0 takes the optimal rotation instead of a merely good one. Below 0.7 it starts making visible mistakes. |
| `headStart` | 0-4 | Neutral nodes pre-claimed along SIG-0's route before you link in. **The second strongest lever**, worth roughly 25 points from 0 to 2. It also shortens SIG-0's route, so it compounds with `oppRam`. |
| `minCost` | int | Target route cost the board generator aims both sides at. Scales with the grid; roughly `2 x width` is a reasonable ask. The generator treats it as a target, not a guarantee, and a small board simply cannot produce a long route. |
| `minPd` | int | Floor on your opening route cost. Stops a lucky board from being closable in one turn. |
| `slag` | 0-0.3 | Density of dead junctions. Higher means fewer routes and more forced play. Above about 0.25 boards start failing to generate. |
| `parFlat` | 0-6 | Flat term of the rotation budget. Cosmetic here: par is shown to the player as a target but a dive is won or lost at the core. |

## Measured table

All rows: `playerRam` 5, `greed` 0.85, `slag` 0.18, `minCost` = 2 x width.

| grid | oppRam | headStart | win rate | avg rounds |
|---|---|---|---|---|
| 9x7 | 4 | 0 | 90.8% | 2.7 |
| 9x7 | 4 | 2 | 64.2% | 2.4 |
| 9x7 | 5 | 0 | 81.7% | 2.7 |
| 9x7 | 5 | 2 | 44.2% | 2.1 |
| 9x7 | 6 | 0 | 60.8% | 2.4 |
| 9x7 | 6 | 2 | 30.8% | 1.9 |
| 11x9 | 4 | 0 | 94.2% | 3.1 |
| 11x9 | 4 | 2 | 68.3% | 2.8 |
| 11x9 | 5 | 0 | 77.5% | 3.0 |
| 11x9 | 5 | 2 | 46.7% | 2.5 |
| 11x9 | 6 | 0 | 60.0% | 2.7 |
| 11x9 | 6 | 2 | 36.7% | 2.3 |
| 13x11 | 4 | 0 | 92.5% | 3.6 |
| 13x11 | 4 | 2 | 80.0% | 3.5 |
| 13x11 | 5 | 0 | 80.8% | 3.5 |
| 13x11 | 5 | 2 | 53.3% | 3.2 |
| 13x11 | 6 | 0 | 53.3% | 3.1 |
| 13x11 | 6 | 2 | 37.5% | 2.8 |

Reading it: `oppRam` and `headStart` are the two levers that matter, and they
compound. Grid size is a much weaker lever than it looks, because a bigger
board lengthens both routes at once.

## Named difficulties

What the crew should aim at when the invocation names a word instead of numbers.

| name | target win rate | feel |
|---|---|---|
| `easy` | 75-85% | You get there first unless you waste turns. Room to look around. |
| `normal` | 50-60% | A real race. Losing a turn to a bad rotation is the difference. |
| `hard` | 30-40% | SIG-0 is ahead at the start and you have to route better than it does. |
| `brutal` | 15-25% | You need a good board and no wasted RAM. Most dives are lost. |

A dive that measures more than 15 points off its target fails the verifier.
That is a wide band on purpose: board generation is stochastic, and the
architect is expected to argue a number, not hit it exactly.

## Rounds

A dive should last 3 to 6 rounds. Under 2 it is over before the player has
read the board; over about 8 the race stops feeling like a race. `avg rounds`
comes out of the simulator alongside the win rate. Bigger grids and lower
`oppRam` both lengthen a dive.
