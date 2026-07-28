# Level schema

The four item types this crew produces, and the engine types they map onto in
the shipped game. Field names and types must match exactly: the game's content
modules are typed TypeScript and a mismatch is a build error, not a warning.

## Proposal envelope

Every agent writes exactly one file, `out/proposals/<agent-name>.json`:

```json
{
  "agent": "arc-composer | encounter-generator | narrative-director",
  "brief": "the brief id from out/BRIEF.md",
  "notes": "optional commentary, prose goes here and nowhere else",
  "items": [ { "id": "...", "type": "..." } ]
}
```

Every item needs a non-empty `id` and `type`. `tools/verify_level.py` checks
this the moment the orchestrator runs it.

## type: "dayconfig-delta"  (arc-composer)

Mirrors one row of `DAY_CONFIGS` in the game's `content/arc.ts`.

```json
{
  "type": "dayconfig-delta", "id": "day-6", "day": 6,
  "set": {
    "grid": [11, 9],
    "oppRam": 7,
    "greed": 0.98,
    "abilityFreq": 0.6,
    "minCost": 20,
    "minPd": 10,
    "headStart": 2,
    "parFlat": 3,
    "slag": 0.22,
    "patchDrop": 0.16,
    "jobTiers": [3, 3, 3]
  },
  "targetWinPct": 56,
  "rationale": "why these numbers, in terms of the reference curve"
}
```

Key meanings:

| key | type | meaning |
|---|---|---|
| `grid` | `[w, h]` | board size. Odd numbers only. 9x7 early, 13x11 late. |
| `oppRam` | int 5-11 | the intrusion's action pool per turn. The heaviest lever. |
| `greed` | 0-1 | how hard the intrusion pushes for the core over playing safe. |
| `abilityFreq` | 0-1 | how often it casts a mode instead of rotating. |
| `minCost` | int | target route cost in rotation RAM. Scales with grid. |
| `minPd` | int, optional | floor on the player's opening route cost. Day 5 and later. |
| `headStart` | int 0-5 | nodes the intrusion already holds at dive start. |
| `parFlat` | int 0-6 | flat term of the par margin. Tapers to 1 by day 9. |
| `slag` | 0-1 | density of unrotatable junk cells at board generation. |
| `patchDrop` | 0-1 | chance a cleared job drops a patch piece. Falls as days rise. |
| `jobTiers` | `[t, t, t]` | difficulty tier of each of the day's three tickets, 1-5. |

`set` may carry any subset, but a level meant to stand alone should set all of
them except `minPd`.

## type: "customer"  (encounter-generator)

Mirrors `CustomerProfile` in the game's `content/customers.ts`.

```json
{
  "type": "customer", "id": "kebab-case",
  "name": "First Last",
  "device": "what they bring in",
  "portrait": "/assets/px/portraits/cust-03.png",
  "quotes": ["intake line A", "intake line B"],
  "winLine": "said when you clear their job",
  "lossLine": "said when you fail it",
  "tiers": [3, 4],
  "dominant": "ward"
}
```

- `quotes` is exactly two strings. One is drawn per job at the counter.
- `tiers` are JOB difficulty tiers, the 1-5 scale. See the tier trap below.
- `dominant` must be one of exactly six strings:
  `redirect`, `armHalt`, `armSiphon` (attack modes),
  `purge`, `lock`, `ward` (defend modes).
- `portrait` reuses one of the six shared pixel portraits,
  `/assets/px/portraits/cust-01.png` through `cust-06.png`. This crew never
  orders new art.

## type: "dayline"  (narrative-director)

One entry of `DAY_LINES` in the game's `content/story.ts`. Shown when the day
opens, before the tickets appear.

```json
{ "type": "dayline", "id": "day-6", "day": 6, "text": "DAY 6. One terminal sentence." }
```

Must open with `DAY <n>.` and stay to one or two short sentences.

## type: "journal"  (narrative-director)

Mirrors `JournalEntry` in the game's `content/journal.ts`. DAD.LOG, the
player's own log.

```json
{
  "type": "journal", "id": "kebab-case",
  "unlockAtRun": 3, "requiresOpened": false,
  "kind": "note | bill | memo",
  "title": "ALL CAPS",
  "date": "in-world date string, e.g. 'day six at the bench'",
  "body": ["paragraph", "paragraph"]
}
```

`unlockAtRun` is a run count, not a day. Entries unlock as runs fail.

## Engine invariants

`tools/verify_level.py` enforces these. A level that fails one is not shippable.

1. **Tier coverage.** Every tier appearing in `jobTiers` has at least one
   customer in the batch whose `tiers` include it. A day asking for a tier 4
   ticket with no tier 4 customer is a crash at ticket generation.
2. **Valid dominant.** Every customer's `dominant` is one of the six mode
   strings, spelled exactly. The Analyze screen's tell table covers all six and
   nothing else.
3. **The dash law.** No em dash or en dash in any player-facing string.
4. **Ranges.** `greed`, `abilityFreq`, `slag`, `patchDrop` in 0-1. `jobTiers`
   is three ints in 1-5. `grid` is two odd ints.
5. **The day opens.** Exactly one `dayline`, and its text begins `DAY <n>.`

## The tier trap

Two different "tier" vocabularies exist in this game.

- **Program tiers are 1-3.** SCAN, ATTACK and DEFEND upgrade levels.
- **Job, customer, and day difficulty tiers are 1-5.**

Everything in this crew uses the 1-5 scale. The engine maps 1-5 onto 1-3
internally when it builds the intrusion's kit; that mapping is not your
problem. If you find yourself writing a tier above 5 or a customer at "tier 3
of 3", you have crossed the vocabularies.
