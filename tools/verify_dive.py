#!/usr/bin/env python3
"""
verify_dive.py - the schema half of the dive crew's checking.

Two things check a dive. This one asks whether the numbers are structurally
sane: right shape, right ranges, odd grid, nothing out of scope. The
simulator (tools/simulate.mjs) asks the harder question of whether the dive is
actually a contest. Neither can answer the other's question.

Standard library only. No install, no network.

    python3 tools/verify_dive.py                     # both proposals
    python3 tools/verify_dive.py --stage board       # mid-pipeline
    python3 tools/verify_dive.py --day-check out/dive-hard.json
"""

from __future__ import annotations

import argparse
import json
import os
import sys

PROPOSALS = {
    "board": ("board-architect.json", "board-architect"),
    "pressure": ("pressure-designer.json", "pressure-designer"),
}

# Anything from the program layer is out of scope. A dive is rotations only,
# so a proposal reaching for these is reaching for a different game.
OUT_OF_SCOPE = (
    "augments", "attackMode", "defendMode", "oppAttackModes", "oppDefendModes",
    "dominant", "abilityFreq", "patchPouch", "scanTier", "attackTier",
    "defendTier", "oppTier", "customer", "quotes", "dayLine", "journal",
)

RANGES = {
    "slag": (0.0, 0.30),
    "greed": (0.0, 1.0),
    "playerRam": (3, 9),
    "oppRam": (2, 9),
    "headStart": (0, 5),
    "parFlat": (0, 8),
    "minCost": (4, 80),
    "minPd": (1, 40),
    "targetWinPct": (1, 99),
}


class Report:
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


def check_ranges(obj: dict, where: str, rep: Report) -> None:
    for key, (lo, hi) in RANGES.items():
        if key not in obj:
            continue
        v = obj[key]
        if not isinstance(v, (int, float)) or isinstance(v, bool):
            rep.error(where, f'"{key}" must be a number, got {v!r}')
        elif not (lo <= v <= hi):
            rep.error(where, f'"{key}" is {v}, outside the workable range {lo} to {hi}')


def check_scope(obj: dict, where: str, rep: Report) -> None:
    for key in obj:
        if key in OUT_OF_SCOPE:
            rep.error(
                where,
                f'"{key}" is out of scope. A dive is a grid, RAM and turns. '
                "No programs, abilities, loadout, customer or story.",
            )


def check_grid(grid, where: str, rep: Report) -> None:
    if (not isinstance(grid, list) or len(grid) != 2
            or not all(isinstance(n, int) and not isinstance(n, bool) for n in grid)):
        rep.error(where, f'"grid" must be [width, height] ints, got {grid!r}')
        return
    if not all(n % 2 == 1 for n in grid):
        rep.error(where, f'"grid" dimensions must both be odd, got {grid!r}')
    if not all(5 <= n <= 15 for n in grid):
        rep.error(where, f'"grid" dimensions must be 5 to 15, got {grid!r}')


def load(path: str, rep: Report):
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


def check_envelope(doc, name: str, expect: str, rep: Report) -> list:
    if not isinstance(doc, dict):
        rep.error(name, "top level is not an object")
        return []
    if doc.get("agent") != expect:
        rep.error(name, f'"agent" should be "{expect}", got {doc.get("agent")!r}')
    if not isinstance(doc.get("brief"), str) or not doc.get("brief"):
        rep.error(name, 'missing top-level "brief" string')
    items = doc.get("items")
    if not isinstance(items, list) or not items:
        rep.error(name, 'missing non-empty "items" array')
        return []
    good = []
    for i, it in enumerate(items):
        if not isinstance(it, dict):
            rep.error(name, f"items[{i}] is not an object")
            continue
        if not it.get("id") or not it.get("type"):
            rep.error(name, f'items[{i}] needs non-empty "id" and "type"')
            continue
        good.append(it)
    return good


def check_board(items: list, rep: Report) -> None:
    boards = [i for i in items if i.get("type") == "board"]
    if len(boards) != 1:
        rep.error("board-architect.json", f"expected exactly 1 board item, found {len(boards)}")
        return
    b = boards[0]
    where = f"board-architect.json [{b['id']}]"
    check_scope(b, where, rep)
    check_grid(b.get("grid"), where, rep)
    check_ranges(b, where, rep)
    if not isinstance(b.get("rationale"), str) or not b.get("rationale"):
        rep.error(where, 'missing "rationale". The shape needs an argument.')
    grid = b.get("grid")
    if isinstance(grid, list) and len(grid) == 2 and all(isinstance(n, int) for n in grid):
        rep.note(f"board {grid[0]}x{grid[1]}, slag {b.get('slag')}, minCost {b.get('minCost')}")
        mc = b.get("minCost")
        if isinstance(mc, int) and mc > grid[0] * grid[1] // 2:
            rep.note(
                f"WARNING: minCost {mc} is large for a {grid[0]}x{grid[1]} board. "
                "The generator will return the longest route it can find instead."
            )


def check_pressure(items: list, rep: Report) -> None:
    ps = [i for i in items if i.get("type") == "pressure"]
    if len(ps) != 1:
        rep.error("pressure-designer.json", f"expected exactly 1 pressure item, found {len(ps)}")
        return
    p = ps[0]
    where = f"pressure-designer.json [{p['id']}]"
    check_scope(p, where, rep)
    check_ranges(p, where, rep)
    for key in ("playerRam", "oppRam", "greed", "headStart", "targetWinPct"):
        if key not in p:
            rep.error(where, f'missing "{key}"')
    if not isinstance(p.get("rationale"), str) or not p.get("rationale"):
        rep.error(where, 'missing "rationale". The target needs an argument.')
    rep.note(
        f"pressure: player RAM {p.get('playerRam')}, opp RAM {p.get('oppRam')}, "
        f"greed {p.get('greed')}, head start {p.get('headStart')}, target {p.get('targetWinPct')}%"
    )


def check_assembled(path: str, rep: Report) -> None:
    doc = load(path, rep)
    if doc is None:
        return
    d = doc.get("dive", doc)
    name = os.path.basename(path)
    check_scope(d, name, rep)
    check_grid(d.get("grid"), name, rep)
    check_ranges(d, name, rep)
    required = ("id", "difficulty", "grid", "playerRam", "oppRam", "greed",
                "minCost", "headStart", "slag", "parFlat", "targetWinPct")
    for key in required:
        if key not in d:
            rep.error(name, f'assembled dive is missing "{key}"')
    if rep.ok:
        rep.note(f"assembled dive {d.get('id')} is complete and in range")


def main() -> int:
    ap = argparse.ArgumentParser(description="Verify a Kernel Panic dive.")
    ap.add_argument("--stage", choices=("board", "pressure", "all"), default="all")
    ap.add_argument("--dir", default="out/proposals")
    ap.add_argument("--day-check", dest="assembled", default=None,
                    help="also validate an assembled dive JSON")
    args = ap.parse_args()

    rep = Report()

    if args.assembled:
        check_assembled(args.assembled, rep)
        scope = f"assembled dive {os.path.basename(args.assembled)}"
    else:
        stages = ("board", "pressure") if args.stage == "all" else (args.stage,)
        for stage in stages:
            fname, agent = PROPOSALS[stage]
            doc = load(os.path.join(args.dir, fname), rep)
            if doc is None:
                continue
            items = check_envelope(doc, fname, agent, rep)
            if not items:
                continue
            (check_board if stage == "board" else check_pressure)(items, rep)
        scope = "dive" if args.stage == "all" else f"stage {args.stage}"

    print(f"verify_dive.py: {scope}")
    for n in rep.notes:
        print(f"  . {n}")

    if rep.ok:
        print(f"  OK. {len(rep.notes)} note(s), 0 problems.")
        return 0

    print(f"\n  {len(rep.errors)} problem(s):")
    for e in rep.errors:
        print(f"  ! {e}")
    print("\nFix by re-running the agent that owns the file. Do not hand-edit "
          "a proposal to make this pass.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
