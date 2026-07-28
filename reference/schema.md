# The dive spec

One dive is one JSON object. This is the whole contract between the crew and
the playable page.

## Proposal envelope

Each agent writes one file to `out/proposals/<agent>.json`:

```json
{
  "agent": "board-architect | pressure-designer",
  "brief": "the id from out/BRIEF.md",
  "notes": "prose commentary goes here and nowhere else",
  "items": [ { "id": "...", "type": "..." } ]
}
```

## type: "board"  (board-architect)

The shape of the maze. What the dive looks like before anyone moves.

```json
{
  "type": "board", "id": "board",
  "grid": [13, 11],
  "slag": 0.18,
  "minCost": 26,
  "minPd": 8,
  "parFlat": 3,
  "rationale": "why this shape, citing the calibration table"
}
```

- `grid` is `[width, height]`, both **odd**. 9x7 is small, 13x11 is large.
- `slag` is dead-junction density, 0 to 0.3. Above 0.25 boards fail to generate.
- `minCost` is the route length the generator aims at. Roughly `2 x width`.
- `minPd` floors your opening route cost so a lucky board is not a one-turn win.

## type: "pressure"  (pressure-designer)

How hard SIG-0 pushes, and what you have to answer with.

```json
{
  "type": "pressure", "id": "pressure",
  "playerRam": 5,
  "oppRam": 5,
  "greed": 0.85,
  "headStart": 2,
  "targetWinPct": 53,
  "rationale": "why these numbers land near the target, citing the table"
}
```

- `playerRam` is your rotations per turn. The calibration table assumes 5.
- `oppRam` is SIG-0's. The strongest lever there is.
- `greed` is how optimally SIG-0 plays, 0 to 1.
- `headStart` is nodes SIG-0 already holds when you link in.
- `targetWinPct` is the claim the simulator will check.

## The assembled dive

The orchestrator merges both proposals into `out/dive-<id>.json`:

```json
{
  "id": "hard",
  "difficulty": "hard",
  "seed": 1,
  "grid": [13, 11],
  "playerRam": 5,
  "oppRam": 6,
  "greed": 0.9,
  "minCost": 26,
  "minPd": 8,
  "headStart": 2,
  "slag": 0.18,
  "parFlat": 3,
  "targetWinPct": 37
}
```

That object is what `tools/build_play.py` inlines into the playable page and
what `tools/simulate.mjs` measures.

## What is deliberately not in here

A dive has no programs, no abilities, no augments, no loadout, no customer,
no story. `engine/` has no code that casts a mode, plants a trap, locks a
junction or spends an augment, so there is no configuration that could
produce one.

What is left is the thing underneath: **a grid of junctions, RAM, and turns.**
You rotate a junction, your signal floods through whatever arms now line up
and claims every neutral node it reaches, and the first flood to touch the
core wins. Claimed ground is permanent and the enemy signal cannot cross it.

If a proposal tries to add a mode, a program or an item, it is out of scope
and the gate rejects it.
