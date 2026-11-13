# Build plan

Build in phases. Finish and test one phase before starting the next. Paste each prompt into Claude Code from the project folder.

---

## Phase 0 — Skeleton and import

**Goal:** a working repo with the canon as data.

```
Read CLAUDE.md and everything in docs/. Then:
1. Initialise a pnpm TypeScript project with Remotion, zod, vitest, tsx, and an .env.example
   and .gitignore (ignore .env, out/, node_modules/, large media caches).
2. Create the folder layout from CLAUDE.md.
3. Write zod schemas for episode.json (docs/PIPELINE.md), characters, sounds and config files.
4. Write `pnpm studio import`: read data/source/kronos-temporada-1.xlsx. Sheets "Personajes",
   "Sonidos", "Estructura" → data/series/*.json. Sheets "Guiones" and "Miniserie - Guiones" →
   one episode folder each with script.md and episode.json (beats, lines split by speaker,
   sfx, onScreenText). Sheets "Publicación" and "Miniserie - Publicación" → the publish block.
   Rename any "Windows" sound to the kronos-* IDs in the bible.
5. Write `pnpm studio validate` and tests for the importer.
Show me the import result for miniseries episode 1 and list anything you could not parse.
```

**Done when:** 16 episode folders exist and validate.

---

## Phase 1 — Animatic (no paid services)

**Goal:** see and hear the timing of an episode with placeholders.

```
Build the Remotion composition "Episode" that renders any episode.json:
- placeholder cards per shot (shot id, framing, visual text) when no image exists
- captions from the lines, styled per docs/STYLE_GUIDE.md
- on-screen text components: episode tag, "DATO REAL" stamp, "Continuará..." card
- the on-twos jitter and pose-swap utilities for type A shots
- audio: placeholder silence sized by an estimate of 2.6 words per second
Add `pnpm studio render <episode> --format vertical`. Render miniseries episode 1 as an animatic.
```

**Done when:** you can watch a full placeholder episode and the length is inside the target.

---

## Phase 2 — Voices

```
Create src/providers/voice with a VoiceProvider interface (synthesize(text, voiceId, settings)
→ wav + optional word timings) and one implementation for the provider named in
config/providers.json. Add caching by hash, a dry-run cost estimate, and
`pnpm studio voices <episode>`. Apply the Kronos effect chain with FFmpeg. If the provider
gives no word timings, align captions with a local whisper.cpp pass. Replace the placeholder
audio in the composition with real files and retime shots to them.
Ask me before the first paid call.
```

**Done when:** miniseries episode 1 plays with all real voices and synced captions.

---

## Phase 3 — Pictures

```
Create src/providers/image and src/providers/video with the same pattern (interface, one
implementation each, cache, estimate). Every character request attaches that character's
sheet from assets/characters/<id>/sheet.png. Add `pnpm studio images <episode>` and
`pnpm studio video <episode>`, plus a "manual mode" that writes prompts.md and waits for me
to drop files into shots/. Build a contact-sheet page (one HTML file per episode) showing
every shot next to the character sheets so I can approve or reject each one.
```

**Done when:** every shot of the pilot has an approved image and the B shots have clips.

---

## Phase 4 — Sound and final render

```
Implement the mix: place recurring and extra SFX from episode.json cues, add music with
ducking, normalise to the targets in docs/PIPELINE.md. Add `pnpm studio sound <episode>`.
Then implement the automatic checks used by the qa-casandra agent: duration window, caption
coverage, "DATO REAL" on screen ≥ 3 s, ending sound present, loudness, missing licences.
Render the final vertical file.
```

**Done when:** the pilot passes QA and you would publish it.

---

## Phase 5 — Publish pack and season compile

```
Implement `pnpm studio publish-pack <episode>` (cover image with the cover text, youtube.md,
tiktok.md, checklist with the AI-label reminder) and `pnpm studio compile <season>` for the
wide long video with chapters, following the "Long video" rules in docs/PIPELINE.md.
```

---

## Phase 6 — Only after 10+ published episodes

- A local web dashboard: episode board by status, costs, approve/reject buttons.
- YouTube upload and scheduling through the YouTube Data API.
- Performance import (views, retention) so `trend-scout` and `scriptwriter` learn from your own results.
- Season 2 writers' room with audience requests.

Do not build Phase 6 first. The dashboard is not what makes the channel grow; the episodes are.
