---
description: Start a new episode from a topic — script, critique, stop at Gate 1
argument-hint: <series> "<topic or title>"
---

Create a new episode: $ARGUMENTS

1. Create the next numbered folder under `episodes/<series>/` with an empty `episode.json` (`status: draft`).
2. Use the `scriptwriter` agent to write `script.md` and the beats.
3. Use the `script-critic` agent to write `critique.md`.
4. If the verdict is REVISE, send the three fixes back to `scriptwriter` once, then critique again. At most two rounds.
5. Stop. Show me: the script table, the verdict, the estimated duration, and anything that needs my decision. Wait for my approval (Gate 1). Do not start the storyboard.
