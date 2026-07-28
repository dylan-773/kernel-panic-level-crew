#!/usr/bin/env python3
"""
Inline a dive spec, the engine bundle, the board styles and the player into
one self-contained HTML file.

The point of inlining is that the result opens by double-clicking it. No
server, no module loader, no install. A browser refuses to load ES modules
or fetch JSON from file://, so everything a dive needs to run has to already
be inside the page.

    python3 tools/build_play.py out/dive-hard.json
    python3 tools/build_play.py out/dive-hard.json --out out/play-hard.html
"""

from __future__ import annotations

import argparse
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read(path: str) -> str:
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def main() -> int:
    ap = argparse.ArgumentParser(description="Build a playable dive page.")
    ap.add_argument("spec", help="path to a dive JSON produced by the crew")
    ap.add_argument("--out", default=None, help="output HTML path")
    args = ap.parse_args()

    shell_path = os.path.join(ROOT, "play", "shell.html")
    css_path = os.path.join(ROOT, "play", "play.css")
    js_path = os.path.join(ROOT, "play", "play.js")
    bundle_path = os.path.join(ROOT, "play", "engine.bundle.js")

    for p in (shell_path, css_path, js_path, bundle_path):
        if not os.path.exists(p):
            print(f"missing {os.path.relpath(p, ROOT)}", file=sys.stderr)
            if p == bundle_path:
                print(
                    "rebuild it with:\n"
                    "  bun build engine/browser-entry.ts --outfile=play/engine.bundle.js "
                    "--format=iife --target=browser",
                    file=sys.stderr,
                )
            return 1

    with open(args.spec, encoding="utf-8") as fh:
        doc = json.load(fh)
    dive = doc.get("dive", doc)

    for key in ("grid", "playerRam", "oppRam", "greed", "headStart", "slag"):
        if key not in dive:
            print(f"{args.spec}: dive is missing \"{key}\"", file=sys.stderr)
            return 1

    out_path = args.out or os.path.join(
        ROOT, "out", f"play-{dive.get('id', 'dive')}.html"
    )

    title = f"Kernel Panic dive: {dive.get('difficulty', 'dive')} {dive['grid'][0]}x{dive['grid'][1]}"

    # </script> inside inlined JSON would close the tag early.
    dive_json = json.dumps(dive, indent=2).replace("</", "<\\/")

    html = read(shell_path)
    for token, value in (
        ("__TITLE__", title),
        ("__CSS__", read(css_path)),
        ("__DIVE__", dive_json),
        ("__ENGINE__", read(bundle_path)),
        ("__PLAY__", read(js_path)),
    ):
        if token not in html:
            print(f"shell.html is missing the {token} slot", file=sys.stderr)
            return 1
        html = html.replace(token, value, 1)

    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as fh:
        fh.write(html)

    kb = len(html.encode("utf-8")) / 1024
    print(f"built {os.path.relpath(out_path, ROOT)}  ({kb:.0f} KB, self-contained)")
    print(f"open it:  open {os.path.relpath(out_path, ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
