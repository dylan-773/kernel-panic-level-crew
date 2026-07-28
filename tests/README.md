# Checks

These two need nothing but the repo, and are the ones to run first:

```bash
node tools/check_bare.mjs      # the engine is a grid, RAM and turns
bunx tsc --noEmit              # the engine typechecks under strict
```

`check_bare.mjs` gates everything else. Do not author a dive on an engine that
can cast.

The rest operate on a run's output, so they need a `/make-dive` to have
happened first. `out/` ships empty:

```bash
python3 tools/verify_dive.py                                # proposal structure and ranges
python3 tools/verify_dive.py --day-check out/dive-hard.json
node    tools/simulate.mjs out/dive-hard.json --seeds 200
python3 tools/build_play.py out/dive-hard.json              # rebuild the playable page
```

`tests/broken-fixture/` holds proposals with deliberate defects: an even grid
dimension, slag past the generation ceiling, an out-of-scope augment list and
dominant mode, an impossible oppRam and greed, and missing rationales. The
verifier should exit 1 and name all eight.

```bash
python3 tools/verify_dive.py --dir tests/broken-fixture
```

## Proving check_bare.mjs actually fails

It is only worth having if it fires. Plant a cast event, rebuild, and watch
both halves catch it:

```bash
cp engine/duel-actions.ts /tmp/da.bak
sed -i '' 's|  emit(s, "rotate");|  emit(s, "rotate");\n  emit(s, "trapFire", 1);|' engine/duel-actions.ts
bun build engine/browser-entry.ts --outfile=play/engine.bundle.js --format=iife --target=browser
node tools/check_bare.mjs        # exit 1: static hit on "trap", runtime hit on the event
cp /tmp/da.bak engine/duel-actions.ts
bun build engine/browser-entry.ts --outfile=play/engine.bundle.js --format=iife --target=browser
node tools/check_bare.mjs        # exit 0
```
