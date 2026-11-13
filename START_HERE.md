# Kronos Studio — start here

A production studio for **"Kronos 2.0 — La Oficina"**, run from Claude Code.
You are the showrunner. The agents do the drafting, prompting, assembling and checking. You approve at four gates.

## What is in this package

| File | What it is for |
|---|---|
| `CLAUDE.md` | The rules Claude Code reads on every session |
| `docs/SERIES_BIBLE.md` | Canon: characters, voices, catchphrases, episode structure, sound rules |
| `docs/STYLE_GUIDE.md` | Claymation look, prompt templates, character consistency rules |
| `docs/PIPELINE.md` | The stages, the folder per episode, the `episode.json` format |
| `docs/EXTERNAL_RESOURCES.md` | What YOU must create or subscribe to outside Claude |
| `docs/BUILD_PLAN.md` | The phases to build the software, with the prompt to paste for each |
| `.claude/agents/*.md` | The nine specialist agents |
| `.claude/commands/*.md` | Slash commands: `/new-episode`, `/produce`, `/compile-long`, `/status` |

## Setup (once)

1. Install Node.js 20+, FFmpeg and Git on your computer. Install Claude Code.
2. Unzip this folder, open a terminal inside it, run `git init`.
3. From your Sheet "Kronos 2.0 — Temporada 1: La Oficina", download the workbook as `.xlsx` and save it as `data/source/kronos-temporada-1.xlsx`.
4. Put your character sheet image in `assets/characters/_reference/lineup.png`.
5. Run `claude` in the folder and paste the Phase 0 prompt from `docs/BUILD_PLAN.md`.

## Before you spend money: fix these five things

1. **Episode length vs TikTok.** Your episodes run 53–58 seconds. TikTok's Creator Rewards Program pays only on videos longer than one minute. Target **62–70 seconds** per episode (add one beat, do not slow the pace). YouTube Shorts accepts this length too.
2. **Bible vs artwork mismatches.** See the table in `docs/SERIES_BIBLE.md`. The Jefe's tie, Kronos's arms and smile, and two characters (Marketing, Hermes) differ between the Sheet and the image. Decide which is canon.
3. **Missing designs.** La Impresora, El Cliente, Legal and El Hacker have no artwork yet. Hermes looks almost identical to El Junior.
4. **Windows sounds.** The scripts use "error de Windows", "inicio de Windows" and "apagado de Windows". The real ones belong to Microsoft. Create original sound-alikes and rename them in the bible (the files here already call them `kronos-error`, `kronos-boot`, `kronos-shutdown`).
5. **Make one pilot by hand first.** Produce miniseries Ep. 1 ("Lunes, 8:59") end to end before automating anything. It shows you which tools actually hold the clay look and the character consistency.
