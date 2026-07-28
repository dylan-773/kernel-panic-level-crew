# Dive gate: normal

## board-architect.json
- board: APPROVE - 11x9 at slag 0.18, minCost 22 (2x width per difficulty.md's "roughly `2 x width` is achievable"), minPd 8 is the default shape difficulty.md's grid guidance points to, and it lines up with the measured table's `11x9 | 6 | 0` row (71.0% win, 3.5 avg rounds). Scope stays board-only (grid, slag, route targets), leaving oppRam/headStart to the Pressure Designer as the rationale itself notes.

## pressure-designer.json
- pressure: APPROVE - claimed targetWinPct 71 matches out/sim.txt exactly: 71.0% (142/200), drift +0.0. oppRam 6 / headStart 0 is taken directly from the measured table's `11x9 | 6 | 0` row and follows difficulty.md's explicit instruction for this band: "`normal` is the band that must tolerate mistakes: prefer `headStart` 0 there." Since headStart is 0, it does not compound with oppRam (difficulty.md: headStart "compounds with `oppRam`" only when nonzero). playerRam 5 and greed 0.85 match the table's stated measurement conditions.

## simulation
- win rate: APPROVE - 71.0% sits inside the 60-75% normal band and away from either extreme; difficulty.md calls a win rate "at either extreme" a broken dive, and this isn't one.
- rounds: NOTE - avg 3.5 is within the 2-5 round band and matches difficulty.md's "11x9 near 3" guidance, comfortably clear of the under-2 floor the gate is told to flag.
- scope: NOTE - out/dive-normal.json carries only grid/RAM/turn fields; no programs, abilities, loadout, customer, or story crept in from either proposal.

Seen 2, approved 2, revised 0, noted 2.
