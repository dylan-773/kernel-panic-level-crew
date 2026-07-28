---
name: make-level
description: Run the four-agent level crew to author one working day of Kernel Panic - difficulty config, customers, day line, journal entry - gated for canon and verified against the engine invariants.
disable-model-invocation: true
---

# /make-level

You are the ORCHESTRATOR of the Kernel Panic level crew. You spawn the four
agents, carry each one's output to the next, run the gate, run the verifier,
and assemble the level. You do not author content yourself. If you find
yourself writing a customer quote or picking a `greed` value, you have taken an
agent's job.

Invocation: `/make-level <day>`, where `<day>` is 1 to 9. Day 10 is the
scripted finale and is out of scope. If no day is given, ask for one.

Run these steps in order.

---

## 1. Brief

Write `out/BRIEF.md`:

```markdown
# Brief: level-<day>

- **id**: level-<day>
- **day**: <day>
- **target win rate**: <from the curve table in reference/shipped.md>
- **customers**: 3
- **scope**: one working day. Difficulty config, customers covering the day's
  job tiers, one day line, one journal entry. No abilities, no art, no sound.
```

Take the target win rate from the `reference/shipped.md` curve table. If the
user named a different target in the invocation, that overrides the table, and
say so in the brief.

## 2. Arc Composer

Spawn `level-arc-composer`. Tell it the brief id and the day. It writes
`out/proposals/arc-composer.json`.

Then run the staged check:

```
python3 tools/verify_level.py --stage arc
```

Non-zero exit means the config is malformed. Re-spawn the agent with the exact
error text and try once. Still failing, stop and report.

## 3. Encounter Generator

Read `out/proposals/arc-composer.json` and **quote the `jobTiers` array in the
prompt**. The handoff is explicit, not implied: the agent should not have to
guess what it is covering.

Spawn `level-encounter-generator` with the brief id, the day, and those tiers.
It writes `out/proposals/encounter-generator.json`.

Then:

```
python3 tools/verify_level.py --stage encounter
```

This is where tier coverage is checked. A gap here is a real failure and not a
style note: re-spawn the agent with the named uncovered tier and try once.

## 4. Narrative Director

Read both proposals so far and **quote in the prompt**: the day's `set` block,
and the customer names with their devices. Spawn
`level-narrative-director`. It writes `out/proposals/narrative-director.json`.

Then:

```
python3 tools/verify_level.py --stage narrative
```

## 5. Gate

Spawn `level-loremaster`. Tell it the brief id and that all three proposals are
in place. It reads them and `reference/bible.md` and writes
`out/gate/review.md`.

Read the review yourself before acting on it. A review with no tally line, or
with fewer verdict lines than there are items, is a failed review: re-spawn the
loremaster once, naming what it skipped.

## 6. Revision round

For each `REVISE` verdict:

- Re-spawn **only** the agent that owns the item. Do not re-run the whole crew.
- Give it three things: the item id, the loremaster's objection, and the bible
  line the loremaster quoted.
- Tell it to revise **only those items** and leave every approved item byte for
  byte as it is.

When every revision is back, re-spawn `level-loremaster` for round 2 over the
same files.

**One revision round only.** Anything still carrying a REVISE after round 2 is
dropped from the level and listed in the final summary for the user to
arbitrate. Never integrate a contested item silently. `NOTE` verdicts are
advisory and never block.

## 7. Verify

```
python3 tools/verify_level.py --day <day>
```

The full pass: envelope shape, the dash law, legal dominant modes, tier
coverage, value ranges, and the day line. Exit 0 and you have a level. Exit 1
names the gap; fix it by re-spawning the owning agent, then run again. Do not
edit an agent's proposal by hand to make the verifier pass. The verifier is the
schema enforcer and hand-patching it defeats the point of the crew.

## 8. Assemble

Write two files.

`out/level-<day>.json`, the whole level in one object:

```json
{
  "level": <day>,
  "brief": "level-<day>",
  "targetWinPct": <n>,
  "dayConfig": { ...the arc composer's set block... },
  "customers": [ ...the customer items, minus "type"... ],
  "dayLine": "DAY <n>. ...",
  "journal": { ...the journal item, minus "type"... },
  "gate": { "seen": <n>, "approved": <n>, "revised": <n>, "dropped": [] }
}
```

`out/level-<day>.ts`, the same content as paste-ready TypeScript matching the
game's content modules. Four blocks, each under a comment naming its
destination:

- `DAY_CONFIGS` is a `Record<number, DayConfig>`, so the day is the **key**,
  not a field. The row is `6: { grid: [11, 9], oppRam: 7, ... },` on one line.
  There is no `day:` property inside it, and `targetWinPct` and `rationale`
  belong to the proposal, not to the row.
- `CustomerProfile` entries as multi-line objects, in the shipped field order:
  `id`, `name`, `device`, `portrait`, `quotes`, `winLine`, `lossLine`,
  `tiers`, `dominant`. No `type` field; that belongs to the proposal envelope.
- the `DAY_LINES` entry as one double-quoted string with a trailing comma.
- the `JournalEntry` as a multi-line object.

Double quotes, trailing commas, two-space indent. Write numbers the way the
shipped table writes them: `0.6`, not `0.60`.

## 9. Report

Print, and stop:

- items produced per agent
- every REVISE verdict, and how it closed (revised and approved, or dropped)
- the verifier result: tier coverage, dominant spread, dash law
- the two output paths

Do not deploy, commit, or write anywhere outside `out/`.
