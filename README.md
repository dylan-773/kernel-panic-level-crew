# Dive Crew — an agent crew that builds playable levels for *Kernel Panic*

**Game: Kernel Panic.** A cyberpunk roguelike about inheriting your father's
computer repair shop. Every repair ticket is an intrusion: something alive is
inside a customer's machine, and clearing it means diving into the device and
racing it to the core.

**What this crew produces: one dive, playable in your browser.**

A dive is a grid of scrambled pipe junctions. Your port sits on one side,
SIG-0's on the other, the core in the middle. Rotating a junction is the only
move you have and it costs 1 RAM. When arms line up, your signal floods
through them and claims every neutral node it reaches, so one good rotation
can cascade a whole chain at once. Claimed ground is permanent and the enemy
signal can never cross it. First flood to touch the core wins.

That is the entire game here. **A grid, RAM, and turns.**

Three agents design one, a simulator measures it, a gate judges it, and the
run ends with a single HTML file you open and play:

```
open out/play-normal.html
```

No server. No install. No API key. The page has the dive spec, the game
engine and the board styling inlined into it, so it opens by double-clicking.

---

## Running it

Requires Claude Code. `node` runs the simulator and `bun` only rebuilds the
engine bundle; both are optional for opening a dive that already exists.

```bash
cd kernel-panic-level-crew
claude
```

then, in the session:

```
/make-dive normal
/make-dive hard 13x11
/make-dive 45%
```

Difficulty is `easy`, `normal`, `hard`, `brutal`, or a bare target percentage.
The optional second argument pins the grid; both dimensions must be odd.
Difficulty targets are measured against a near-optimal reference bot, so each
band sits deliberately above the human experience it produces — a `normal`
dive has room for human mistakes.

Headless:

```bash
claude -p "/make-dive hard 13x11" --permission-mode acceptEdits
```

Everything in `out/` is generated — nothing there was authored by hand. The
committed contents are one real run of `/make-dive normal`, kept so the
crew's output can be inspected and played without running the pipeline; the
next run overwrites them.

---

## Architecture

```mermaid
flowchart TD
    U(["/make-dive hard 13x11"]) --> O["Orchestrator<br/>.claude/skills/make-dive"]
    O --> B[/"out/BRIEF.md<br/>difficulty, target win rate, grid"/]

    REF[("reference/<br/>difficulty.md · schema.md")]

    B --> BA["1 · Board Architect<br/>in: difficulty, optional grid<br/>out: grid, slag, route length"]
    BA -->|"grid 13x11"| PD["2 · Pressure Designer<br/>in: the board<br/>out: RAM both sides, greed,<br/>head start, target win %"]

    REF -.->|"measured calibration table"| BA
    REF -.-> PD
    REF -.-> GT

    BA --> P[("out/proposals/*.json")]
    PD --> P
    P --> V{{"verify_dive.py<br/>shape, ranges, odd grid, scope"}}
    V -->|"malformed"| BA
    V -->|"out of range"| PD
    V -->|"clean"| ASM["assemble<br/>out/dive-hard.json"]

    ASM --> SIM{{"simulate.mjs<br/>200 dives, engine's own bot"}}
    SIM --> SR[/"out/sim.txt<br/>measured win rate vs claim"/]

    SR --> GT["3 · Dive Gate<br/>in: proposals + measurement<br/>out: APPROVE / REVISE per item"]
    GT --> G[/"out/gate/review.md"/]

    G -->|"REVISE, names the owning agent"| RV{"revision round<br/>max 1"}
    RV --> BA
    RV --> PD

    G -->|"all APPROVE"| BLD["build_play.py<br/>inline spec + engine + board"]
    BLD --> PLAY(["out/play-hard.html<br/>open it and play"])
```

---

## The three agents

Each one's output is the next one's input.

None of them places a junction by hand. What an agent authors is the **spec**
— grid size, slag density, route-length target, the pressure numbers — and
the engine grows a concrete board from that spec plus a seed, rejecting
layouts until one passes its fairness checks. `NEXT SEED` on the playable
page deals a fresh board from the same dive. That is why the simulator can
play 200 different boards and still be measuring the agents' work: they
authored the envelope every one of those boards must land inside, and the
win rate is a property of the envelope, not of one lucky layout.

### 1. Board Architect — `board-architect`

**In:** the requested difficulty, and an explicit grid if you gave one.
**Out:** `grid`, `slag`, `minCost`, `minPd`, `parFlat`.

Shapes the maze. Grid size is the dive's silhouette; slag density carves an
open field into corridors so the choice of direction matters; `minCost` is
the route length the generator aims at. It argues its shape against the
measured calibration table rather than picking numbers by feel.

**Remove it and:** there is no board, and the Pressure Designer has no grid
to size its numbers against.

### 2. Pressure Designer — `pressure-designer`

**In:** the Board Architect's grid.
**Out:** `playerRam`, `oppRam`, `greed`, `headStart`, and a `targetWinPct`.

Decides the race. `oppRam` is the strongest lever; `headStart` is second and
compounds with it, because ground SIG-0 already holds also shortens its
route. Then it commits to a number, which the simulator immediately checks.

**Remove it and:** there is a board with no contest on it.

### 3. Dive Gate — `dive-gate`

**In:** both proposals plus the simulator's measured numbers.
**Out:** `out/gate/review.md`, APPROVE / REVISE / NOTE per item.

Asks whether this is a dive worth playing, which neither the schema check nor
the win rate can answer alone. Is the claim near the measurement? Is the dive
a contest rather than decided at generation? Are `headStart` and `oppRam`
double-counting the same pressure? Every REVISE must cite a measured number
or a calibration row, and must name the agent that owns the fix. A verdict it
cannot support drops to an advisory NOTE.

**Remove it and:** a dive that measures 20 points off its claim ships anyway.

---

## Four kinds of checking

| | `check_bare.mjs` | `verify_dive.py` | `simulate.mjs` | Dive Gate |
|---|---|---|---|---|
| asks | is the engine still bare? | is the spec well formed? | is it a contest? | is it worth playing? |
| kind | static grep + 300 played dives | stdlib Python | the engine, 200 dives | an agent with judgment |
| catches | any program, trap or cast code in `engine/` | out-of-range knobs, even grid dimensions, out-of-scope keys | unwinnable, uncontested, or off-target dives | double-counted levers, a bad claim, a dive over in two rounds |
| verdict | exit 0 / exit 1 naming the file and line | exit 0 / exit 1 | exit 0 / exit 1 with the measured number | APPROVE, REVISE citing a number, or NOTE |

Mechanical rules live in scripts, which cannot be talked out of a verdict.
Empirical questions go to the simulator, which plays the dive 200 times with
the engine's own route-following bot — the same harness that measured every
row of `reference/difficulty.md`, so the agents argue from numbers this repo
reproduces on demand. Judgment goes to the gate, constrained by having to
cite one of the other two. `check_bare.mjs` runs first, before any agent is
spawned.

---

## The engine has nothing but the grid

`engine/` holds the duel engine: board generation, flood and claim, cascade
resolution, the rotation-cost router, and SIG-0's route planner. Roughly
1400 lines, no external dependencies, bundling to 26 KB of plain JavaScript.

What it deliberately does not hold: programs, modes, traps, locks, wards,
augments. An early build of this repo kept that ability code and switched it
off by configuration — `abilityFreq: 0`. That looked right and was not: the
flag gated only one of five cast rules in SIG-0's planner, so the intrusion
cast REDIRECT in 49 of 60 dives. Capability that is merely configured off is
capability waiting for a mistake, so the code was removed outright, and
`tools/check_bare.mjs` asserts it stays gone — statically, and by playing
300 dives and watching what they emit.

Rebuild the browser bundle after any engine change:

```bash
bun build engine/browser-entry.ts --outfile=play/engine.bundle.js \
  --format=iife --target=browser
```

---

## What a run produces

`/make-dive normal` fills `out/` with seven files:

```
out/BRIEF.md                          the brief, written by the orchestrator
out/proposals/board-architect.json    grid, slag, route length
out/proposals/pressure-designer.json  RAM, greed, head start, claimed win rate
out/dive-normal.json                  the two proposals assembled
out/sim.txt                           200 dives, measured
out/gate/review.md                    APPROVE / REVISE per item
out/play-normal.html                  open this and play
```

The run committed in `out/` is one such invocation: an 11x9 board at
slag 0.18, `playerRam` 5 against `oppRam` 6 with no head start. The Pressure
Designer **claimed 71% and the simulator measured 71.0%** over 200 seeds —
mid-band for `normal` (60-75%), 3.5 rounds average — and the gate approved
all four items, each verdict citing a calibration row or a measured number.
Your run will differ; the agents are not deterministic.

---

## Layout

```
kernel-panic-level-crew/
  README.md                     this file
  ARCHITECTURE.md               diagram, data flow, failure paths
  CLAUDE.md                     orients the orchestrator session
  .claude/
    settings.json               lets the three tools run without a prompt
    agents/                     board-architect, pressure-designer, dive-gate
    skills/make-dive/SKILL.md   the orchestration program behind /make-dive
  reference/
    difficulty.md               measured calibration table, difficulty bands
    schema.md                   proposal shapes and the assembled dive
  engine/                       the duel engine
  play/
    engine.bundle.js            prebuilt browser bundle, committed
    play.css                    board styles
    play.js                     board renderer and turn loop
    shell.html                  page template the build fills in
  tools/
    verify_dive.py              structure and ranges
    simulate.mjs                200 dives, measured win rate
    build_play.py               inlines everything into one openable file
  out/                          one committed run; /make-dive overwrites it
```

---

## Roadmap

The dive is the floor of *Kernel Panic*: every other system in the design
sits on top of the rotation race, so it is the piece worth getting right
first.

- **Programs.** The full design adds SCAN, ATTACK and DEFEND, with six modes
  between them. Bringing them in means building that layer deliberately and
  widening `check_bare.mjs`'s allowed vocabulary, which is a decision someone
  has to make on purpose. That is the point of the checker.
- **Loadout.** The design has eighteen augments. A loadout agent choosing the
  player's answer to a given intrusion is the natural fourth seat, once
  programs exist.
- **Tuning loop.** The simulator reports and the gate assigns blame. Feeding
  the measured number straight back to the Pressure Designer and re-running
  until it converges makes the target self-correcting.
- **Boards worth remembering.** `minCost` and `slag` produce texture by
  accident. An agent that reads a generated board and judges whether it is
  interesting, rather than merely fair, would close the last gap between a
  correct dive and a good one.
