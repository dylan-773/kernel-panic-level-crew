---
name: make-dive
description: Run the three-agent crew to author one playable Kernel Panic dive - a grid, RAM, and turns - then simulate it, gate it, and build a self-contained HTML page you can open and play.
disable-model-invocation: true
---

# /make-dive

You are the ORCHESTRATOR of the dive crew. You spawn agents, carry each one's
output to the next, run the simulator, run the gate, and build the playable
page. You do not author content yourself. If you find yourself picking an
`oppRam` value, you have taken an agent's job.

Invocation: `/make-dive <difficulty> [WxH]`

- `<difficulty>` is `easy`, `normal`, `hard`, `brutal`, or a bare target win
  percentage like `45%`.
- `[WxH]` is an optional explicit grid, e.g. `13x11`. Both numbers odd.

Examples: `/make-dive hard`, `/make-dive normal 9x7`, `/make-dive 45%`.

If no difficulty is given, default to `normal`.

---

## 0. Confirm the engine is still bare

```
node tools/check_bare.mjs
```

A dive is a grid, RAM and turns. This asserts the program layer is absent from
`engine/` rather than merely disabled, statically and by playing 300 dives.
**If it fails, stop and report.** Do not author a dive on an engine that can
cast, and never fix a failure here by widening the allowed vocabulary.

## 1. Brief

Write `out/BRIEF.md`:

```markdown
# Brief: dive-<difficulty>

- **id**: <difficulty>
- **difficulty**: <the word, or "custom">
- **target win rate**: <from the named bands in reference/difficulty.md, or the given %>
- **grid**: <the explicit grid, or "architect's choice">
- **scope**: one dive. A grid, RAM, and turns. No programs, no abilities,
  no loadout, no customer, no story.
```

## 2. Board Architect

Spawn `board-architect` with the brief id, the difficulty, and the explicit
grid if one was given. It writes `out/proposals/board-architect.json`.

```
python3 tools/verify_dive.py --stage board
```

Non-zero exit means the board is malformed. Re-spawn the agent with the exact
error text, once. Still failing, stop and report.

## 3. Pressure Designer

Read the board proposal and **quote its `grid` in the prompt**. The handoff is
explicit, not implied.

Spawn `pressure-designer`. It writes `out/proposals/pressure-designer.json`.

```
python3 tools/verify_dive.py --stage pressure
```

## 4. Assemble

Merge both proposals into `out/dive-<id>.json`, using the assembled shape in
`reference/schema.md`. Add `"seed": 1`. Then:

```
python3 tools/verify_dive.py --day-check out/dive-<id>.json
```

## 5. Simulate

```
node tools/simulate.mjs out/dive-<id>.json --seeds 200 | tee out/sim.txt
```

This plays the dive 200 times with the engine's own routing bot and reports the
real win rate against the claimed target. It exits non-zero when the dive is
unwinnable, uncontested, or more than 15 points off target.

**A non-zero exit here is not a build failure to route around.** It is the
measurement the Pressure Designer committed to, coming back wrong. Carry the
number into the gate and let the gate assign it.

If `node` is unavailable, say so in the final report and continue; the gate
then works from the proposals alone and the dive ships unmeasured.

## 6. Gate

Spawn `dive-gate`. It reads both proposals and `out/sim.txt`, and writes
`out/gate/review.md`.

Read the review yourself. A review with no tally, or with fewer verdict lines
than there are items, is a failed review: re-spawn the gate once, naming what
it skipped.

## 7. Revision round

For each `REVISE`, re-spawn **only** the agent the verdict names. Give it the
item id, the objection, and the measured number or quoted line behind it. Tell
it to revise only that item.

Then re-assemble (step 4), re-simulate (step 5), and re-gate (step 6).

**One revision round only.** A dive still carrying a REVISE after round 2 ships
with the objection recorded in the final report. Never quietly drop the
verdict. `NOTE` verdicts are advisory and never block.

## 8. Build the playable page

```
python3 tools/build_play.py out/dive-<id>.json
```

That writes `out/play-<id>.html`: one self-contained file with the dive spec,
the engine and the board inlined. It opens by double-clicking, with no server
and no install.

Never hand-edit that file. It is generated, and the next build overwrites it.

## 9. Report

Print, and stop:

- the assembled dive's numbers
- claimed win rate vs measured win rate, and average rounds
- every REVISE verdict and how it closed
- the path to the playable page, and the literal command to open it:
  `open out/play-<id>.html`

Do not write anywhere outside `out/`.
