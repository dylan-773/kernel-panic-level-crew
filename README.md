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
run ends with a single HTML file you open and play.

```
python3 tools/build_play.py out/dive-hard.json
open out/play-hard.html
```

No server. No install. No API key. The page has the dive spec, the game engine
and the board styling inlined into it, so it opens by double-clicking.

---

## Running it

Requires Claude Code. `node` is used to simulate the dive and `bun` only if you
change the engine; both are optional for opening a dive that already exists.

```bash
cd kernel-panic-level-crew
claude
```

then, in the session:

```
/make-dive hard
/make-dive normal 9x7
/make-dive 45%
```

Difficulty is `easy`, `normal`, `hard`, `brutal`, or a bare target percentage.
The optional second argument pins the grid; both dimensions must be odd.

Headless:

```bash
claude -p "/make-dive hard 13x11" --permission-mode acceptEdits
```

A completed run is committed under `out/`, so you can open a dive and play it
without spending a token.

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

### 1. Board Architect — `board-architect`

**In:** the requested difficulty, and an explicit grid if you gave one.
**Out:** `grid`, `slag`, `minCost`, `minPd`, `parFlat`.

Shapes the maze. Grid size is the dive's silhouette; slag density is what
carves an open field into corridors so the choice of direction matters;
`minCost` is the route length the generator aims at. It argues its shape
against the measured calibration table rather than picking numbers by feel.

**Remove it and:** there is no board, and the Pressure Designer has no grid to
size its numbers against.

### 2. Pressure Designer — `pressure-designer`

**In:** the Board Architect's grid.
**Out:** `playerRam`, `oppRam`, `greed`, `headStart`, and a `targetWinPct`.

Decides the race. `oppRam` is the strongest lever in the file, worth roughly
15 to 20 points of win rate per point. `headStart` is second and compounds
with it, because ground SIG-0 already holds also shortens its route. Then it
commits to a number, which the simulator immediately checks.

**Remove it and:** there is a board with no contest on it.

### 3. Dive Gate — `dive-gate`

**In:** both proposals plus the simulator's measured numbers.
**Out:** `out/gate/review.md`, APPROVE / REVISE / NOTE per item.

Asks whether this is a dive worth playing, which neither the schema check nor
the win rate can answer alone. Is the claim near the measurement? Is the dive
a contest rather than decided at generation? Are `headStart` and `oppRam`
double-counting the same pressure? Every REVISE must cite a measured number or
a line from the calibration table, and must name the agent that owns the fix.
A verdict it cannot support drops to an advisory NOTE.

**Remove it and:** a dive that measures 20 points off its claim ships anyway.

---

## Two kinds of checking

| | `verify_dive.py` | `simulate.mjs` | Dive Gate |
|---|---|---|---|
| asks | is it well formed? | is it a contest? | is it worth playing? |
| kind | stdlib Python | the real engine, 200 dives | an agent with judgment |
| catches | bad ranges, even grid dimensions, out-of-scope keys | unwinnable, uncontested, or off-target dives | double-counted levers, a bad claim, a dive over in two rounds |

`simulate.mjs` plays the dive with `botPlayTurn`, the engine's own routing bot,
at the same greed the shipped game uses to calibrate its difficulty curve. A
win rate printed here means the same thing as a win rate in the game's own
balance table, rather than a number from a bot this repo invented.

---

## The engine is the real one

`engine/` is the shipped game's duel engine, vendored whole and unmodified:
board generation, flood and claim, cascade resolution, route planning, and the
opponent AI. It has no external dependencies, so it bundles to 58 KB of plain
JavaScript that runs in a browser with no framework.

The dive spec pins the program layer off. `abilityFreq` is hard zero and the
player always carries the base kit, so neither side can cast anything and what
remains is the rotation race underneath. `engine/index.ts` is the only place
that mapping lives, so a malformed spec cannot accidentally hand SIG-0 an
ability.

Rebuild the browser bundle after any engine change:

```bash
bun build engine/browser-entry.ts --outfile=play/engine.bundle.js \
  --format=iife --target=browser
```

The board's SVG rendering and every `kp-d*` style is lifted from the shipped
game too, so a generated dive looks like the real board rather than a mock of
it.

---

## The committed run: `/make-dive hard 13x11`

Everything under `out/` is a real run.

| knob | value | owner |
|---|---|---|
| grid | 13x11 | board-architect |
| slag | 0.18 | board-architect |
| minCost / minPd | 26 / 8 | board-architect |
| playerRam | 5 | pressure-designer |
| oppRam | 6 | pressure-designer |
| greed | 0.85 | pressure-designer |
| headStart | 2 | pressure-designer |

**Claimed 37%. Measured 34.0%** over 200 seeds, a drift of 3 points, inside
the 30-40% band `hard` asks for. Endings: core 195, severed 4, gridlock 1.

The gate approved both items and raised one advisory NOTE it deliberately did
not assign: average rounds measured 2.8, under the 3-to-6 band. Its reasoning
is worth reading, because it is the kind of call a schema check cannot make:

> the only calibrated 13x11 row in the hard win-rate band is also the one with
> the shortest rounds; the neighboring rows that run longer land at 53.3% win
> rate, outside the target. Advisory only, no better calibrated lever
> combination exists in the table for this board size, so there is nothing
> actionable to hand back.

The Pressure Designer had already flagged the same tension in its rationale
before the simulator ran. Nothing was handed back, and the dive ships slightly
quick with that recorded rather than hidden.

Play it:

```bash
open out/play-hard.html
```

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
    difficulty.md               measured calibration table and what each knob does
    schema.md                   proposal shapes and the assembled dive
  engine/                       the game's duel engine, vendored
  play/
    engine.bundle.js            prebuilt browser bundle, committed
    play.css                    board styles, lifted from the shipped game
    play.js                     board renderer and turn loop
    shell.html                  page template the build fills in
  tools/
    verify_dive.py              structure and ranges
    simulate.mjs                200 dives, measured win rate
    build_play.py               inlines everything into one openable file
  out/                          a completed run, including a playable dive
```

---

## Roadmap

The dive is the floor of the game: every other system in *Kernel Panic* sits on
top of a rotation race, so it is the piece worth getting right first.

- **Programs.** The engine already implements SCAN, ATTACK and DEFEND with six
  modes between them. Unpinning `abilityFreq` and adding an agent that designs
  the intrusion's mode kit turns the race into a fight.
- **Loadout.** Eighteen augments ship in the engine. A loadout agent choosing
  the player's answer to a given intrusion is the natural fourth seat.
- **Tuning loop.** The simulator currently reports and the gate assigns blame.
  Feeding the measured number straight back to the Pressure Designer and
  re-running until it converges makes the target self-correcting.
- **Boards worth remembering.** `minCost` and `slag` produce texture by
  accident. An agent that reads a generated board and judges whether it is
  interesting, rather than merely fair, would close the last gap between a
  correct dive and a good one.
