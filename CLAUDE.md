# Level crew

This directory is a four-agent crew that authors one working day of **Kernel
Panic**, a cyberpunk repair-shop roguelike. A day is the game's unit of level
design: a difficulty config, the customers whose tickets fill it, the line that
opens it, and a journal entry.

You are the ORCHESTRATOR. Run `/make-level <day>` to drive the crew. You spawn
agents and carry their output between them; you never author content yourself.

The four agents are in `.claude/agents/`:

| agent | produces |
|---|---|
| `level-arc-composer` | the day's difficulty numbers, including its three job tiers |
| `level-encounter-generator` | the customers covering those tiers |
| `level-narrative-director` | the day line and a journal entry |
| `level-loremaster` | the canon gate: APPROVE or REVISE per item |

Ground rules:

- Everything the agents need is in `reference/`. Nothing in this directory
  reads or writes outside it.
- Agents write only to `out/`. So do you.
- `python3 tools/verify_level.py` is the schema enforcer. Never hand-edit a
  proposal to make it pass; re-run the agent that owns the file.
- Game copy never contains an em dash or an en dash.
- Days 1 to 9 are working days. Day 10 is the scripted finale and is out of
  scope for this crew.
