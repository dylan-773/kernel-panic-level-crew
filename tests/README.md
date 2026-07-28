# Checks

```bash
python3 tools/verify_dive.py                        # structure and ranges
python3 tools/verify_dive.py --day-check out/dive-hard.json
node     tools/simulate.mjs out/dive-hard.json --seeds 200
python3  tools/build_play.py out/dive-hard.json     # rebuild the page
```

`tests/broken-fixture/` holds proposals with deliberate defects: an even grid
dimension, slag past the generation ceiling, an out-of-scope augment list, and
a missing rationale. The verifier should exit 1 and name all of them.

```bash
python3 tools/verify_dive.py --dir tests/broken-fixture
```
