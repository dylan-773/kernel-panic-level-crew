# Architecture

Four agents, one shared reference set, one deterministic verifier, one gate
with a revision loop.

## Diagram

```mermaid
flowchart TD
    U(["User: /make-level 6"]) --> O["Orchestrator<br/>.claude/skills/make-level<br/>spawns agents, carries handoffs"]
    O --> B[/"out/BRIEF.md<br/>day, target win rate, scope"/]

    REF[("reference/<br/>bible.md · schema.md · shipped.md")]

    B --> AC["1 · Arc Composer<br/>in: day, target win rate<br/>out: dayconfig-delta"]
    AC -->|"jobTiers [3,3,3]"| EG["2 · Encounter Generator<br/>in: the day's job tiers<br/>out: customer profiles"]
    EG -->|"customers + devices"| ND["3 · Narrative Director<br/>in: day config, customers<br/>out: dayline + journal"]
    AC -->|"day config"| ND

    REF -.->|"canon, schema, shipped roster"| AC
    REF -.-> EG
    REF -.-> ND
    REF -.-> LM

    AC --> P[("out/proposals/*.json")]
    EG --> P
    ND --> P

    P --> V1{{"verify_level.py --stage<br/>run after each agent"}}
    V1 -->|"malformed"| AC
    V1 -->|"tier gap"| EG
    V1 -->|"bad copy shape"| ND
    V1 -->|"clean"| LM

    LM["4 · Loremaster<br/>in: all proposals + bible<br/>out: APPROVE / REVISE per item"]
    LM --> G[/"out/gate/review.md<br/>every REVISE quotes a bible line"/]

    G -->|"REVISE + citation"| RV{"revision round<br/>max 1"}
    RV -->|"re-run only the owning agent"| AC
    RV -->|"re-run only the owning agent"| EG
    RV -->|"re-run only the owning agent"| ND
    RV -->|"still contested after round 2"| DROP(["dropped, reported to user"])

    G -->|"all APPROVE"| V2{{"verify_level.py<br/>full pass"}}
    V2 -->|"exit 1, gap named"| RV
    V2 -->|"exit 0"| OUT[/"out/level-6.json<br/>out/level-6.ts"/]
    OUT --> GAME(["paste into Kernel Panic:<br/>arc.ts · customers.ts · story.ts · journal.ts"])
```

## Why the data flows this way

The pipeline is sequential because each agent's output is literally the next
one's input, not because sequencing is tidy.

**Arc Composer first.** Its `jobTiers` array is the only thing that tells the
Encounter Generator what to build. Three tiers means three tickets, and each
distinct tier needs somebody who works at it. Run the Encounter Generator first
and it is inventing customers for a day that does not exist yet.

**Encounter Generator second.** The Narrative Director's day line is supposed
to notice what walks in the door. It cannot do that before anybody walks in.

**Narrative Director third.** It reads both prior outputs: the numbers tell it
what the day feels like mechanically, the customers tell it who the day is
about. Its output is the only thing here the player reads as authored prose
rather than as a fight.

**Loremaster last, over everything.** A gate that ran per-agent would miss the
things that are only wrong in combination: two customers with the same verbal
tic, a day line that promises a tone the roster does not deliver.

## The two kinds of checking

They are deliberately different mechanisms, and the split is the point.

| | `verify_level.py` | Loremaster |
|---|---|---|
| asks | can the game load this? | is this true? |
| kind | deterministic Python | an agent with judgment |
| catches | tier coverage gaps, illegal mode strings, out-of-range values, em dashes, malformed envelopes | canon contradictions, reveals ahead of schedule, duplicated devices, voice drift |
| verdict | exit 0 or exit 1 with the gap named | APPROVE, REVISE with a quoted line, or NOTE |
| can be argued with | no | it must cite the bible, or it may only advise |

Mechanical rules go in the script, where they are cheap, instant, and cannot be
talked out of a verdict. Judgment goes to the agent, which is constrained by
having to quote its source. A REVISE that cannot cite a bible line is
downgraded to an advisory NOTE, which keeps the gate from becoming an
unfalsifiable second opinion.

## Failure paths

Nothing in this pipeline fails silently.

- **Malformed proposal** — the staged verifier catches it before the next agent
  wastes a turn reading garbage. The owning agent is re-run with the exact
  error text.
- **Tier coverage gap** — caught at stage 2. This is the one that would crash
  the real game at ticket generation, so it is checked mechanically rather than
  left to review.
- **Canon break** — caught at the gate, sent back to exactly one agent with the
  citation, re-gated once.
- **Still contested after one revision round** — the item is dropped from the
  level and named in the run summary. It is never integrated quietly.
- **Verifier fails after the gate** — the run stops. The orchestrator is
  explicitly forbidden from hand-editing a proposal to make the verifier pass,
  because at that point the output would no longer be the crew's.
