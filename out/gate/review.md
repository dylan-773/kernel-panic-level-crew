# Dive gate: hard

## board-architect.json
- board: APPROVE - 13x11 matches the brief's explicit ask, slag stays at the shipped default of 0.18 (the calibration table's 13x11 rows are all taken at slag 0.18, per reference/difficulty.md), and minCost 26 is exactly `2 x width` as the guideline recommends ("roughly `2 x width` is a reasonable ask"). This lands the board squarely on the table's calibrated 13x11/oppRam 6/headStart 2 row rather than an extrapolated shape, and the simulator's 34.0% measured result confirms that row behaves as documented. No scope creep (no programs, abilities, loadout, customer, or story in the proposal).

## pressure-designer.json
- pressure: APPROVE - targetWinPct 37 vs. measured 34.0% is a drift of -3.0, well inside the tolerance difficulty.md sets ("A dive that measures more than 15 points off its target fails the verifier"). oppRam 6 and headStart 2 is the exact calibrated row difficulty.md lists at 37.5% for 13x11, and the rationale correctly shows this is not double-counting: neither lever is maxed (oppRam tops out at 8, headStart at 4), and the neighboring rows the proposal cites (oppRam 6/headStart 0 -> 53.3%, oppRam 5/headStart 2 -> 53.3%) demonstrate both levers are needed together to reach the hard band, not that either alone is being stacked to an extreme. No scope creep.

## simulation
- rounds: NOTE - avg rounds measures 2.8, under the "3 to 6 rounds" band difficulty.md sets for a dive, though still above the 2-round floor where difficulty.md says a dive "is over before the player has read the board." The pressure-designer's own rationale flags this ("a touch under the 3-6 round guideline") and shows the only calibrated 13x11 row in the hard win-rate band (oppRam 6/headStart 2) is also the one with the shortest rounds; the neighboring rows that run longer land at 53.3% win rate, outside the target. Advisory only — no better calibrated lever combination exists in the table for this board size, so there is nothing actionable to hand back.

Seen 3, approved 2, revised 0, noted 1.
