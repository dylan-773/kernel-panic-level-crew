// level-6: one working day of Kernel Panic. Paste-ready.
// Target win rate 56%. Gate: 6 seen, 6 approved, 0 revised.

// content/arc.ts -> DAY_CONFIGS (Record<number, DayConfig>, the day is the key)
6: { grid: [11, 9], oppRam: 7, greed: 0.98, abilityFreq: 0.6, minCost: 20, minPd: 10, headStart: 2, parFlat: 3, slag: 0.22, patchDrop: 0.16, jobTiers: [3, 3, 3] },

// content/customers.ts -> CustomerProfile[]
{
  id: "talia-vance",
  name: "Talia Vance",
  device: "Aqualume reef tank controller",
  portrait: "/assets/px/portraits/cust-02.png",
  quotes: [
    "It keeps rerouting the saltwater feed into my freshwater tank at 3am.",
    "The tetras are gone now. Last night it started aiming at the reef tank too.",
  ],
  winLine: "Water is running to the right tanks again. The reef looks almost embarrassed it ever doubted me.",
  lossLine: "The reef tank answers to somebody else's schedule now.",
  tiers: [2, 3],
  dominant: "redirect",
},
{
  id: "emmett-cho",
  name: "Emmett Cho",
  device: "Feedrail busking amp rig",
  portrait: "/assets/px/portraits/cust-04.png",
  quotes: [
    "It pulls charge off every rig on the block the second I start playing.",
    "Last night it drained my partner's amp dead mid set, just so I could play louder.",
  ],
  winLine: "It draws its own charge now, nothing more. The whole block has power again.",
  lossLine: "Every amp on that block answers to it now.",
  tiers: [3, 4],
  dominant: "armSiphon",
},
{
  id: "priya-osei",
  name: "Priya Osei",
  device: "Loomgate embroidery frame",
  portrait: "/assets/px/portraits/cust-06.png",
  quotes: [
    "It unstitches names overnight. I open the shop to blank collars.",
    "This morning it took the groom's own initials off his jacket, hours before the wedding.",
  ],
  winLine: "Every initial holds now. He walks in with his name still on him.",
  lossLine: "The jacket came back blank. It kept the name, not the shirt.",
  tiers: [3, 4],
  dominant: "purge",
},

// content/story.ts -> DAY_LINES
"DAY 6. Three tickets, same weight today. No easy one to start on.",

// content/journal.ts -> JournalEntry
{
  id: "three-stubs-same-price",
  unlockAtRun: 4,
  requiresOpened: false,
  kind: "bill",
  title: "THREE STUBS, SAME PRICE",
  date: "day six at the counter",
  body: [
    "Found three ticket stubs stapled together this morning. Same intake fee, same parts estimate, same turnaround. Rhea swears she did not do it on purpose.",
    "She prices by tier, not by feel, she says. I believe her. I also watched her circle the total twice before she filed it.",
    "The Meridian statement was under the stack. The balance did not move this month. It also did not shrink.",
  ],
},
