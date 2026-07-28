# KERNEL PANIC - SETTING BIBLE

Canon for this crew. The Loremaster gates against this file and must quote a
line from it to issue a REVISE, so every ruling a level rests on has to be
written down here first. It grows as the crew reaches new content.

## The world

- Near-future cyberpunk city, seen entirely from inside one repair shop.
  Districts, courier drones, lifter exosuits, clinics, pawn shops, night
  pharmacies. Everyday machines are smart enough to be haunted.
- "Diving" is real and mundane: a person links into a device and fights what is
  inside it on a grid. Repair techs dive customer machines for pay.
- Intrusions are epidemic: viruses in this world are AI, dynamic and alive,
  infecting machines the way biological viruses infect a body. Clearing one is
  not deleting static code; it fights back, which is why every repair is a
  dive. Every shop ticket is an intrusion job.
- The epidemic's cause is mundane and unexplained. It has no causal link to
  Patch, to Dad, or to the shop.
- Money is credits. Small businesses run close to the bone; medical debt is
  ordinary and crushing.
- Presentation frame: the player experiences everything through KP/OS, the
  shop terminal's retro pixel desktop.

## Technology rules

- A dive is a duel on a shared grid of scrambled pipe junctions. Both signals
  race to the core. Rotating junctions is the only movement verb; claimed
  territory is permanent and impassable to the enemy signal.
- RAM is the in-dive action currency; rotations and programs draw on one pool.
- Every diver carries the same three programs, 1 RAM each, always: SCAN,
  ATTACK (modes: redirect, armHalt, armSiphon), DEFEND (modes: purge, lock,
  ward). Augments bend the economy; they never add verbs.
- Opponents inside devices are scripted intrusions with one dominant mode
  each. The Analyze diagnostic's tell is always honest.
- Neural strain is the body's cost of diving. Strain zero severs the
  connection: a blackout, not a death. The diver wakes up shaking and needs
  soup.
- Cumulative strain scars the nervous system permanently. Meridian Neurocare
  codes it NF-3, neurofilament degradation, staged; stage three kills.

## The shop

- A family computer repair shop, inherited jointly by the two kids on Dad's
  death, per the will taped inside the register.
- Layout: front counter (Rhea's), the bench (the player's), and a curtained,
  padlocked back room holding the tower.
- Debt: the Meridian balance alone is more than the shop clears in a year.
- Rhythm: ten days on the book per attempt. Nine working days of three tickets
  each, then Day 10, when "the back room settles up".
- House rule, Dad's: everything that lives in this shop gets a name.

## Characters

### The player - the son
- Unnamed on screen, permanently. No given name, no surname, ever, for him or
  any family member. Hard law.
- A natural diver. Learned patience at Dad's bench as a child.
- Keeps DAD.LOG, the journal. Voice: wry, grieving, methodical.

### Rhea - the sister
- Runs the counter, keeps the books, keeps her brother alive. Never dives.
- Voice: dry, protective, deflects feeling into logistics.
- Calls the machine "the virus" until the story says otherwise. Her theory
  erodes on a fixed schedule; do not accelerate it.

### Dad
- Only ever "Dad" in copy. No given name, no surname, ever. Hard law.
- Secretly a diver of enormous hours, nightly after close, on his own tower.
  Built Patch for his son. The diving caused the illness.
- Sealed the back room himself with one condition: not until the boy can beat
  Patch square. No shortcuts.
- Voice in fragments: patient, wry, workbench koans, no self-pity.

### Patch - the companion
- An AI Dad built and trained in the back-room tower. Named for "the thing
  that holds a broken thing together while it mends".
- Not a virus. Hard law, regardless of shared substrate.
- Speaks only after the finale: warm, confident, lightly competitive.

### The machine - the tower
- No ticket, no owner in the ledger. It is a curriculum, not security: goes
  easy when the player is weak, hardens exactly as fast as he improves.
- The seal opens only on "A FAIR WIN, NO ASSISTS".

## The customers

Every job is an intrusion in a machine somebody loves. The customer is fond of
the device; the intrusion is a betrayal, not an inconvenience. Tiers are job
difficulty 1-5. Dominant is the intrusion's guaranteed early mode, and the
Analyze tell always reports it honestly.

The twelve shipped regulars are listed in `shipped.md`. Never duplicate one of
their names, device concepts, or verbal tics.

## Brands and proper nouns

Hexlight, Kestrel, Meridian (one conglomerate: office and ledger hardware, and
Meridian Neurocare the clinic, both), Copperline, Nocta, Halcyon, Ferrox,
Ivora, Apothek, Ledgerstone, Polyverb.

NF-3: neurofilament degradation. KP/OS: the shop terminal. DAD.LOG: the
player's journal. Night Patch: the 60-credit strain restore.

New brands are allowed and encouraged: one invented word, no vowel salad, the
texture of the list above.

## Voice - hard laws

- Retro terminal. Clipped, diegetic, concrete. Short sentences.
- NEVER em dashes or en dashes in player-facing copy. Periods, commas, or
  "..." only. This is enforced by `tools/verify_level.py` and by the gate.
- Journal titles are ALL CAPS. Day lines open "DAY N."
- The sister is Rhea. The companion is Patch. The father is only ever "Dad".
- System voice: short caps declaratives.
- Customer win lines are relief with personality. Loss lines are one cold
  sentence in the shop's ledger voice, usually about what the machine kept.
- Nothing a customer says may reveal anything about Patch, Dad, or the back
  room. Customers do not know the shop has a mystery in it.
