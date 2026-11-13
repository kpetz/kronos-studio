# Kronos Studio

Production pipeline for the claymation-style office comedy **"Kronos 2.0 — La Oficina"**.
Output: vertical episodes (TikTok, YouTube Shorts) and a compiled long video per season (YouTube).

The human owner is the **showrunner**. Agents propose; the showrunner approves.

## Canon — read before any creative work

- `docs/SERIES_BIBLE.md` — characters, voices, catchphrases, structure, sound rules
- `docs/STYLE_GUIDE.md` — visual style and prompt templates
- `docs/PIPELINE.md` — stages, folders, `episode.json` schema
- `docs/SUBSCRIPTION_MODE.md` — **current operating mode**: no paid APIs; pictures and video by handoff, voices on the free tier. It overrides any paid-API step elsewhere.
- `data/source/` — the showrunner's original scripts (read-only)

Never invent canon. If a script needs a new character, prop, catchphrase or recurring sound, propose it in `docs/proposals/` and wait for approval.

## Language

- All series content (dialogue, narration, on-screen text, titles, descriptions, hashtags) is in **neutral Latin American Spanish**.
- Code, comments, commit messages and agent reports are in English.
- Talk to the showrunner in the language he uses.

## Pipeline and gates

```
idea → script → critique → [GATE 1: script approved]
     → storyboard + prompts → [GATE 2: storyboard approved, cost estimate accepted]
     → images/video + voices + sound → assembly → QA
     → [GATE 3: final cut approved] → publish pack → [GATE 4: showrunner publishes]
```

Each episode lives in `episodes/<season>/<nn>-<slug>/` and its state is in `episode.json` (`status` field). Never skip a gate. Never change `status` to an approved state yourself; only the showrunner does, by saying so.

## Hard rules

1. **No spend without consent.** Before any call to a paid API (voice, image, video), print the number of calls and an estimated cost, and wait for "yes". Cache every generated asset by a hash of its prompt and settings; never regenerate an asset that already exists.
2. **No automatic publishing.** The publisher agent prepares files and metadata. Uploading is done by the showrunner, or by a script only after he explicitly asks in that session.
3. **Secrets stay in `.env`.** Never print, commit or log API keys. `.env` is in `.gitignore`.
4. **Only licensed or original audio.** No real operating-system sounds, no commercial music, no clips from other creators. Every file in `assets/sfx` and `assets/music` has a line in `assets/LICENSES.md`.
5. **No copying other creators.** Trend research informs topics and formats. Scripts, characters, jokes and visuals are original.
6. **Label AI content.** Every publish pack includes the reminder to turn on the platform's AI-generated content label.
7. **No real people or real brands** in scripts or images. The office, the company and all names are fictional.
8. **Each episode must be distinct.** Same cast and format, different problem, different gags, different physical comedy. Templated repetition puts monetization at risk.

## Stack

- Node.js 20+, TypeScript, pnpm
- Remotion for composition and rendering; FFmpeg for audio and transcodes
- Provider adapters in `src/providers/` (voice, image, video). The rest of the code never calls a vendor SDK directly, so providers can be swapped.
- `zod` schemas for `episode.json` and all config files

## Layout

```
.claude/agents/      specialist agents
.claude/commands/    slash commands
docs/                bible, style guide, pipeline, build plan
data/source/         original scripts (xlsx) — read-only
data/series/         imported canon as JSON (characters, sounds, structure)
config/              voices.json, providers.json, render.json
assets/characters/   reference sheets, expressions (per character)
assets/sets/         background plates
assets/sfx/ music/ fonts/
episodes/            one folder per episode
src/                 pipeline code, providers, Remotion compositions
out/                 renders (git-ignored)
```

## Commands

- `pnpm studio import` — xlsx → `data/series/*.json` and episode folders
- `pnpm studio validate <episode>` — schema and canon checks
- `pnpm studio estimate <episode>` — API calls and cost estimate
- `pnpm studio voices|images|video|sound <episode>` — generate one asset type
- `pnpm studio handoff <episode>` / `pnpm studio ingest <episode>` — prompt pack out, downloaded files in
- `pnpm studio sfx find "<description>"` — CC0 sound search with licence logging
- `pnpm studio render <episode> [--format vertical|wide]`
- `pnpm studio compile <season>` — long video from approved episodes
- `pnpm remotion studio` — preview

## Working style

- Small commits, one concern each. Run `pnpm typecheck` and `pnpm test` before committing.
- When a stage fails, report what failed and the smallest fix. Do not silently fall back to lower quality.
- Keep reports short: what was done, what needs a decision, what it will cost.
