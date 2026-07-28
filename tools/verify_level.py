#!/usr/bin/env python3
"""
verify_level.py - the deterministic half of the Kernel Panic level crew.

The four agents propose. This script decides whether what they proposed can
actually be dropped into the game. It encodes the invariants the real engine
enforces at build and at run time, so a level that passes here is one the game
can load without a typecheck error or a ticket-generation crash.

Standard library only. No install step, no API key, no network.

    python3 tools/verify_level.py                 # full pass over out/proposals
    python3 tools/verify_level.py --day 6         # also check the day number matches
    python3 tools/verify_level.py --stage arc     # staged check, mid-pipeline
    python3 tools/verify_level.py --dir some/dir  # check a different proposal set

Exit 0: the level is shippable. Exit 1: every problem found, named, with the
file and item it came from.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

# The six intrusion modes. Three attack, three defend. The Analyze screen's
# tell table covers exactly these and nothing else, so a seventh string is a
# customer whose intrusion the game cannot describe.
ATTACK_MODES = ("redirect", "armHalt", "armSiphon")
DEFEND_MODES = ("purge", "lock", "ward")
OPP_MODES = ATTACK_MODES + DEFEND_MODES

# Job, customer and day difficulty tiers. NOT program tiers, which are 1-3.
MIN_TIER, MAX_TIER = 1, 5

# Every field a player can read. The dash law applies to all of them.
COPY_FIELDS = ("name", "device", "quotes", "winLine", "lossLine",
               "text", "title", "body", "date")

DASHES = ("—", "–")  # em dash, en dash

# Shipped roster. A new customer may not reuse one of these names.
SHIPPED_NAMES = {
    "juno vex", "sable okonkwo", "aldous wick", "wren tallis",
    "bram hollander", "dex marlowe", "june aksoy", "ines calloway",
    "emeric snow", "vera stanek", "casimir bell", "noor behzadi",
}

SHARED_PORTRAITS = {f"/assets/px/portraits/cust-0{n}.png" for n in range(1, 7)}

UNIT_KEYS = ("greed", "abilityFreq", "slag", "patchDrop")
INT_KEYS = ("oppRam", "minCost", "minPd", "headStart", "parFlat")

PROPOSALS = {
    "arc": "arc-composer.json",
    "encounter": "encounter-generator.json",
    "narrative": "narrative-director.json",
}


class Report:
    """Collects every problem instead of dying on the first one, so one run
    tells an agent everything it has to fix."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.notes: list[str] = []

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def note(self, msg: str) -> None:
        self.notes.append(msg)

    @property
    def ok(self) -> bool:
        return not self.errors


def find_dashes(value) -> bool:
    if isinstance(value, str):
        return any(d in value for d in DASHES)
    if isinstance(value, list):
        return any(find_dashes(v) for v in value)
    if isinstance(value, dict):
        return any(find_dashes(v) for v in value.values())
    return False


def load(path: str, rep: Report):
    """Read one proposal file. Returns None if it is missing or unparseable."""
    name = os.path.basename(path)
    if not os.path.exists(path):
        rep.error(name, "missing. The agent that owns it did not write it.")
        return None
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        rep.error(name, f"not valid JSON ({exc}). Rewrite the whole file.")
        return None


def check_envelope(doc, name: str, expect_agent: str, rep: Report) -> list:
    """Every proposal carries agent, brief, and a non-empty items array, and
    every item carries a non-empty id and type."""
    if not isinstance(doc, dict):
        rep.error(name, "top level is not an object")
        return []

    agent = doc.get("agent")
    if not isinstance(agent, str) or not agent:
        rep.error(name, 'missing top-level "agent" string')
    elif agent != expect_agent:
        rep.error(name, f'"agent" is "{agent}", expected "{expect_agent}"')

    if not isinstance(doc.get("brief"), str) or not doc.get("brief"):
        rep.error(name, 'missing top-level "brief" string (the id from out/BRIEF.md)')

    items = doc.get("items")
    if not isinstance(items, list) or not items:
        rep.error(name, 'missing non-empty "items" array')
        return []

    good = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            rep.error(name, f"items[{i}] is not an object")
            continue
        if not item.get("id") or not item.get("type"):
            rep.error(name, f'items[{i}] needs non-empty "id" and "type"')
            continue
        # The dash law, applied to every copy field on every item.
        for key, value in item.items():
            if key in COPY_FIELDS and find_dashes(value):
                rep.error(
                    f"{name} [{item['id']}]",
                    f'"{key}" contains an em or en dash. Game copy never does. '
                    'Use a period, a comma, or "..."',
                )
        good.append(item)
    return good


def check_arc(items: list, rep: Report, day: int | None):
    """The day config: one dayconfig-delta, values in range, tiers on the 1-5
    scale, grid odd. Returns the jobTiers so the encounter check can use them."""
    deltas = [it for it in items if it.get("type") == "dayconfig-delta"]
    if len(deltas) != 1:
        rep.error("arc-composer.json",
                  f"expected exactly 1 dayconfig-delta item, found {len(deltas)}")
        return None

    delta = deltas[0]
    where = f"arc-composer.json [{delta['id']}]"

    d = delta.get("day")
    if not isinstance(d, int) or not (1 <= d <= 9):
        rep.error(where, f'"day" must be an int 1-9 (day 10 is the finale), got {d!r}')
    elif day is not None and d != day:
        rep.error(where, f'"day" is {d} but the run asked for day {day}')

    if not isinstance(delta.get("targetWinPct"), (int, float)):
        rep.error(where, 'missing numeric "targetWinPct"')
    if not isinstance(delta.get("rationale"), str) or not delta.get("rationale"):
        rep.error(where, 'missing "rationale". The numbers need an argument.')

    cfg = delta.get("set")
    if not isinstance(cfg, dict) or not cfg:
        rep.error(where, 'missing non-empty "set" object')
        return None

    for key in UNIT_KEYS:
        if key in cfg:
            v = cfg[key]
            if not isinstance(v, (int, float)) or not (0.0 <= v <= 1.0):
                rep.error(where, f'"{key}" must be a number in 0..1, got {v!r}')

    for key in INT_KEYS:
        if key in cfg and not isinstance(cfg[key], int):
            rep.error(where, f'"{key}" must be an int, got {cfg[key]!r}')

    grid = cfg.get("grid")
    if grid is None:
        rep.error(where, '"set" is missing "grid"')
    elif (not isinstance(grid, list) or len(grid) != 2
          or not all(isinstance(n, int) for n in grid)):
        rep.error(where, f'"grid" must be [width, height] ints, got {grid!r}')
    elif not all(n % 2 == 1 for n in grid):
        rep.error(where, f'"grid" dimensions must both be odd, got {grid!r}')

    tiers = cfg.get("jobTiers")
    if (not isinstance(tiers, list) or len(tiers) != 3
            or not all(isinstance(t, int) for t in tiers)):
        rep.error(where, f'"jobTiers" must be exactly 3 ints, got {tiers!r}')
        return None
    if not all(MIN_TIER <= t <= MAX_TIER for t in tiers):
        rep.error(where,
                  f'"jobTiers" must be on the 1-5 job difficulty scale, got {tiers!r}. '
                  "Program tiers are 1-3 and are a different vocabulary.")
        return None

    return tiers


def check_encounter(items: list, rep: Report, job_tiers: list | None):
    """The customers: legal dominant modes, tiers on the right scale, exactly
    two intake quotes, shared portraits, no shipped names reused, and full
    coverage of the day's job tiers."""
    customers = [it for it in items if it.get("type") == "customer"]
    if not customers:
        rep.error("encounter-generator.json", "no customer items")
        return

    dominants: dict[str, int] = {}
    covered: set[int] = set()

    for c in customers:
        where = f"encounter-generator.json [{c['id']}]"

        for key in ("name", "device", "winLine", "lossLine", "portrait"):
            if not isinstance(c.get(key), str) or not c.get(key):
                rep.error(where, f'missing non-empty "{key}"')

        name = c.get("name")
        if isinstance(name, str) and name.strip().lower() in SHIPPED_NAMES:
            rep.error(where, f'"{name}" is already a shipped regular. Pick someone new.')

        portrait = c.get("portrait")
        if isinstance(portrait, str) and portrait not in SHARED_PORTRAITS:
            rep.error(where,
                      f'portrait "{portrait}" is not one of the six shared portraits. '
                      "This crew orders no new art.")

        quotes = c.get("quotes")
        if not isinstance(quotes, list) or len(quotes) != 2:
            rep.error(where, f'"quotes" must be exactly 2 intake lines, got {quotes!r}')
        elif not all(isinstance(q, str) and q for q in quotes):
            rep.error(where, '"quotes" entries must be non-empty strings')

        dom = c.get("dominant")
        if dom not in OPP_MODES:
            rep.error(where,
                      f'"dominant" is {dom!r}. It must be one of: {", ".join(OPP_MODES)}')
        else:
            dominants[dom] = dominants.get(dom, 0) + 1

        tiers = c.get("tiers")
        if not isinstance(tiers, list) or not tiers:
            rep.error(where, '"tiers" must be a non-empty array')
        elif not all(isinstance(t, int) and MIN_TIER <= t <= MAX_TIER for t in tiers):
            rep.error(where,
                      f'"tiers" must be ints on the 1-5 job difficulty scale, got {tiers!r}')
        else:
            covered.update(tiers)

    # The invariant that actually crashes the game if violated: a day asking
    # for a tier with nobody who works at it has a ticket it cannot fill.
    if job_tiers:
        missing = sorted(set(job_tiers) - covered)
        if missing:
            rep.error("encounter-generator.json",
                      "tier coverage gap. The day's jobTiers "
                      f"{job_tiers} include tier(s) {missing} with no customer whose "
                      '"tiers" contain them. Every job tier needs a customer.')
        else:
            rep.note(f"tier coverage: jobTiers {job_tiers} all covered by "
                     f"{len(customers)} customers")

    if dominants:
        spread = ", ".join(f"{k} x{v}" for k, v in sorted(dominants.items()))
        rep.note(f"dominant spread: {spread}")
        if len(dominants) == 1 and len(customers) > 1:
            rep.note("WARNING: every customer shares one dominant mode. "
                     "The day will read as one fight three times.")


def check_narrative(items: list, rep: Report, day: int | None):
    """The words: exactly one day line opening DAY N., and one journal entry."""
    daylines = [it for it in items if it.get("type") == "dayline"]
    journals = [it for it in items if it.get("type") == "journal"]

    if len(daylines) != 1:
        rep.error("narrative-director.json",
                  f"expected exactly 1 dayline item, found {len(daylines)}. "
                  "A day with no line does not open.")
    else:
        dl = daylines[0]
        where = f"narrative-director.json [{dl['id']}]"
        text = dl.get("text")
        d = dl.get("day", day)
        if not isinstance(text, str) or not text:
            rep.error(where, 'missing "text"')
        elif isinstance(d, int) and not text.startswith(f"DAY {d}."):
            rep.error(where, f'"text" must open with "DAY {d}.", got {text[:24]!r}')
        if day is not None and dl.get("day") != day:
            rep.error(where, f'"day" is {dl.get("day")!r} but the run asked for day {day}')

    if len(journals) != 1:
        rep.error("narrative-director.json",
                  f"expected exactly 1 journal item, found {len(journals)}")
    else:
        j = journals[0]
        where = f"narrative-director.json [{j['id']}]"
        if j.get("kind") not in ("note", "bill", "memo"):
            rep.error(where, f'"kind" must be note, bill or memo, got {j.get("kind")!r}')
        title = j.get("title")
        if not isinstance(title, str) or not title:
            rep.error(where, 'missing "title"')
        elif title != title.upper():
            rep.error(where, f'journal titles are ALL CAPS, got {title!r}')
        if not isinstance(j.get("date"), str) or not j.get("date"):
            rep.error(where, 'missing "date" (an in-world string, not a real date)')
        body = j.get("body")
        if not isinstance(body, list) or not body:
            rep.error(where, '"body" must be a non-empty array of paragraphs')
        elif not all(isinstance(p, str) and p for p in body):
            rep.error(where, '"body" entries must be non-empty strings')
        if not isinstance(j.get("unlockAtRun"), int):
            rep.error(where, '"unlockAtRun" must be an int run count, not a day number')


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify a Kernel Panic level proposal set.")
    ap.add_argument("--stage", choices=("arc", "encounter", "narrative", "all"),
                    default="all", help="check only what exists so far")
    ap.add_argument("--day", type=int, default=None,
                    help="assert the level is for this day")
    ap.add_argument("--dir", default="out/proposals",
                    help="directory holding the proposal JSON files")
    args = ap.parse_args()

    rep = Report()
    stages = ("arc", "encounter", "narrative") if args.stage == "all" else (args.stage,)

    def read(stage: str, expect_agent: str) -> list:
        path = os.path.join(args.dir, PROPOSALS[stage])
        doc = load(path, rep)
        if doc is None:
            return []
        return check_envelope(doc, PROPOSALS[stage], expect_agent, rep)

    job_tiers = None

    # The arc proposal is read whenever a later stage needs its jobTiers, even
    # if the caller only asked to check that later stage.
    if "arc" in stages or "encounter" in stages:
        arc_items = read("arc", "arc-composer")
        if arc_items:
            job_tiers = check_arc(arc_items, rep, args.day)

    if "encounter" in stages:
        enc_items = read("encounter", "encounter-generator")
        if enc_items:
            check_encounter(enc_items, rep, job_tiers)

    if "narrative" in stages:
        nar_items = read("narrative", "narrative-director")
        if nar_items:
            check_narrative(nar_items, rep, args.day)

    scope = "level" if args.stage == "all" else f"stage {args.stage}"
    print(f"verify_level.py: {scope} in {args.dir}/")

    for note in rep.notes:
        print(f"  . {note}")

    if rep.ok:
        print(f"  OK. {len(rep.notes)} note(s), 0 problems.")
        return 0

    print(f"\n  {len(rep.errors)} problem(s):")
    for err in rep.errors:
        print(f"  ! {err}")
    print("\nFix by re-running the agent that owns the file. Do not hand-edit "
          "a proposal to make this pass.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
