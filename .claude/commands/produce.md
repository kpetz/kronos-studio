---
description: Produce an episode whose script is approved — storyboard, assets, edit, QA, publish pack
argument-hint: <episode-id>
---

Produce episode: $ARGUMENTS

Check `status` in its `episode.json` and continue from there. Never skip a gate.

1. `script_approved` → use `storyboard-artist` for the shot list, prompts and estimate. **Stop for Gate 2** (shots and cost).
2. `storyboard_approved` → run in parallel: `voice-director` (voices), `storyboard-artist` (pictures), then `sound-designer` (needs the voices). Report failures and missing assets.
3. `assets_ready` → use `editor` to assemble and render the vertical version.
4. `rendered` → use `qa-casandra`. On FAIL, send each item to its owner, fix, render again, QA again. At most three rounds, then ask me.
5. `qa_passed` → show me the file path and the QA summary. **Stop for Gate 3** (final cut).
6. `cut_approved` → use `publisher` to build the publish pack. **Stop for Gate 4**; I upload.

At every stop: what was done, what it cost so far, what you need from me.
