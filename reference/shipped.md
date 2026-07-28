# What is already in the game

A snapshot of the shipped content this crew extends. Read it so you match the
voice and never duplicate a name, a device concept, or a curve position.

## The run

Ten days per attempt. Days 1-9 are working days of three tickets each. Day 10
is the scripted finale against the tower and is **out of scope for this crew**.

## The difficulty curve: DAY_CONFIGS

The whole difficulty design of the game is this one table. Balance is data, not
code.

| day | grid | oppRam | greed | abilityFreq | minCost | minPd | headStart | parFlat | slag | patchDrop | jobTiers | target win % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 9x7 | 6 | 0.70 | 0.20 | 16 | - | 0 | 6 | 0.18 | 0.35 | 1,1,1 | 82 |
| 2 | 9x7 | 6 | 0.76 | 0.32 | 16 | - | 0 | 5 | 0.18 | 0.35 | 1,1,2 | 77 |
| 3 | 9x9 | 6 | 0.88 | 0.45 | 18 | - | 1 | 5 | 0.19 | 0.24 | 1,2,2 | 74 |
| 4 | 9x9 | 6 | 0.91 | 0.45 | 18 | - | 2 | 4 | 0.20 | 0.22 | 2,2,3 | 56 |
| 5 | 11x9 | 7 | 0.94 | 0.55 | 20 | 9 | 2 | 4 | 0.21 | 0.18 | 2,3,3 | 58 |
| 6 | 11x9 | 7 | 0.98 | 0.60 | 20 | 10 | 2 | 3 | 0.22 | 0.16 | 3,3,3 | 56 |
| 7 | 11x11 | 7 | 0.99 | 0.65 | 21 | 10 | 3 | 2 | 0.23 | 0.13 | 3,3,4 | 49 |
| 8 | 13x11 | 8 | 0.98 | 0.70 | 22 | 10 | 3 | 2 | 0.24 | 0.12 | 4,4,4 | 42 |
| 9 | 13x11 | 10 | 0.97 | 0.75 | 24 | 12 | 4 | 1 | 0.25 | 0.11 | 4,4,5 | 39 |

Target win % is the kit-less proxy win rate the simulation harness reports.
Reading the shape: a gentle opening, a real step down at day 4 when the
intrusion starts holding ground before you arrive, a plateau through the
middle, then a hard slide from day 7 as the grid outgrows the RAM pool.

Levers, smallest first: `greed`, then `abilityFreq`, then `oppRam`, then
`headStart`. `grid` almost never moves; it is the day's silhouette.

## The day lines: DAY_LINES

```
DAY 1. The shop is yours. Three tickets on the spike.
DAY 2. Three tickets waiting. Strain carries over.
DAY 3. Word is getting around. The tickets are getting stranger.
DAY 4. The intrusions are pacing themselves now. Watch for it.
DAY 5. Halfway. The back room has been quiet. Just quiet.
DAY 6. Rhea left coffee on the bench. Three tickets, no excuses.
DAY 7. The hard cases are finding you. Take them anyway.
DAY 8. Strain is a budget. Spend it like rent is due.
DAY 9. Last day of paying work. Tomorrow the back room settles up.
```

One or two clipped sentences. Half of them carry a mechanical nudge, half
carry the shop. None of them explain anything.

## The twelve shipped regulars

Never reuse a name, a device concept, or a verbal tic from this roster.

| id | name | device | tiers | dominant | the hook |
|---|---|---|---|---|---|
| juno-vex | Juno Vex | Hexlight arcade handheld | 1,2 | armSiphon | a ghost second player keeps setting records |
| sable-okonkwo | Sable Okonkwo | Kestrel courier drone | 1,2 | redirect | something rewrites her routes and looks proud of it |
| aldous-wick | Aldous Wick | Meridian ledger terminal | 1,2,3 | armHalt | forty years of books that bite the hand that files |
| wren-tallis | Wren Tallis | studio master ledger | 1,2 | ward | something hides her tracks and plays hide and seek |
| bram-hollander | Bram Hollander | Copperline register hub | 2,3 | lock | his own register walls the till off from him |
| dex-marlowe | Dex Marlowe | Nocta cram deck | 2,3 | redirect | his homework reroutes itself toward the arcade |
| june-aksoy | June Aksoy | Halcyon clinic gateway | 3,4 | ward | it walls off a hospital ward at a time, at shift change |
| ines-calloway | Ines Calloway | Ferrox lifter exosuit | 3,4 | armHalt | it cuts servos at the worst second, like a test |
| emeric-snow | Emeric Snow | Ivora chess cabinet | 4,5 | purge | it stopped playing chess and started playing him |
| vera-stanek | Vera Stanek | Apothek dosage safe | 4,5 | armSiphon | it rations the dispensary's power like pills |
| casimir-bell | Casimir Bell | Ledgerstone pawn vault | 4,5 | lock | the vault grew a lock nobody bought |
| noor-behzadi | Noor Behzadi | Polyverb synth brain | 4,5 | purge | it performs her sets while she sleeps. Colder. |

### Voice samples

Intake, at the counter. Two sentences, the second one worse than the first:

> "Something in her nav keeps rewriting my routes. She flew a package to the
> wrong district twice and looked proud of it."

> "It waits until I reach for the keypad, then it kills the lights. The whole
> dispensary, dark, every time."

Win line, after the dive. Relief with personality:

> "She flies straight again. First clean run all month. You are on my good
> list, which is short."

Loss line. One cold sentence, ledger voice, usually about what the machine
kept:

> "Forty years of accounts, and it kept every one."

### Journal sample: DAD.LOG

```
THE BACK ROOM   (day one at the bench)

Every machine in this shop has a ticket, an owner, and a smell. Except one.

The tower in the back room has no ticket. Rhea says it is quarantined, that
Dad walled off a nasty virus in there years ago and never got around to
wiping it. She says leave it.

The lock opened for me this morning like it was expecting me.
```

## Shared portraits

Six pixel portraits are shared across the roster. Reuse one:

```
/assets/px/portraits/cust-01.png    /assets/px/portraits/cust-04.png
/assets/px/portraits/cust-02.png    /assets/px/portraits/cust-05.png
/assets/px/portraits/cust-03.png    /assets/px/portraits/cust-06.png
```
