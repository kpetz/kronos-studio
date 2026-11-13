# Subscription mode — no paid API credits

The showrunner has subscription plans (Claude, a Google AI plan with Flow and Nano Banana) and **no API billing**. This file overrides the provider sections of `BUILD_PLAN.md` and `EXTERNAL_RESOURCES.md` wherever they assume paid APIs.

## How each asset is produced

| Asset | Tool | Mode | Who presses the button |
|---|---|---|---|
| Stills (poses, sets) | Nano Banana inside Google Flow or the Gemini app | **Handoff** | Showrunner |
| Moving clips | Google Flow (frames-to-video from an approved still) | **Handoff** | Showrunner |
| Voices | Gemini TTS with an AI Studio API key on the free tier | **Automatic**, with handoff fallback | Studio |
| Sound effects | Freesound (CC0 only) through its free API, plus local recordings | **Automatic search, human pick** | Studio + showrunner |
| Music | Pixabay Music, YouTube Audio Library, CC0 packs | **Handoff** | Showrunner |
| Edit, captions, mix, render | Remotion + FFmpeg on the showrunner's computer | **Automatic** | Studio |

Flow credits and Gemini app usage cannot be spent through an API. Do not automate the Flow or Gemini web pages with scripts, browser bots or third-party "Flow API" services: it puts the Google account at risk. The studio prepares everything so the manual step is copy, paste, download.

## Handoff mode (pictures and video)

`pnpm studio handoff <episode>` writes `episodes/<ep>/handoff/`:

```
handoff/
  README.md            the order to work in and how many credits it should take
  01-stills.md         one block per still: shot id, which reference images to attach, the prompt
  02-clips.md          one block per clip: shot id, which approved still is the first frame,
                       the motion prompt, duration, model tier to pick
  refs/                copies of the character sheets and set plates needed, named as in the blocks
inbox/                 the showrunner drops downloads here, any file name
```

`pnpm studio ingest <episode>`:
1. Shows each file in `inbox/` and matches it to a shot. Match by file name if it contains the shot id (`s07`), otherwise by download order against the handoff list, and ask when unsure.
2. Moves it to `shots/`, records the prompt used and the date in `episode.json`.
3. Runs the picture checks from the `storyboard-artist` agent and marks pass or fail.
4. Prints what is still missing.

Rules for the handoff lists:
- Stills first, clips second. A clip is requested only after its first-frame still passed QA.
- **Every clip is at most 8 seconds**, one action, one camera move. A beat that needs more is split into two clips that cut on action. Never plan around the tool's maximum length.
- Order the list so shots that share a set and characters are consecutive.
- State the expected credit use at the top, using the credit costs in `config/providers.json` (the showrunner fills these in from his plan page).
- Type B (clips) stay at four or fewer per episode. Everything else is animated stills in Remotion.

## Prompt repair loop (when a Flow result is wrong)

The `prompt-doctor` agent owns this.

1. The showrunner reports the shot id and what went wrong in a few words ("Jefe has no moustache", "camera flew around", "Junior's mouth does not move", "it added text").
2. The agent looks up the failure in `docs/prompt-lessons.md`, rewrites the prompt with the smallest change, and explains the change in one line.
3. After two failed repairs, the agent proposes a simpler shot (closer framing, fewer characters, less motion) or converts it to a type A animated still.
4. Every fix that worked is appended to `docs/prompt-lessons.md` as: symptom → cause → fix → example. The storyboard agent reads this file before writing new prompts, so the same mistake is not repeated.

Starting lessons:
- One action per clip. Two actions in one prompt usually produce neither.
- Describe what moves and say that everything else stays still.
- Always start from an approved still; text-only video prompts drift off-model.
- Name the camera: "locked camera" or "slow push-in". Unnamed cameras wander.
- No dialogue in video prompts. Voices come from the voice stage, mouths are flapped in the edit.
- No on-screen text in prompts. Text is an overlay.
- Fewer characters per shot. Three clay puppets in one moving shot rarely all stay on-model; cut between singles.

## Voices on the free tier

- Provider: Gemini TTS through the Gemini API with a key created in Google AI Studio, on a project **without billing enabled**, so it cannot charge.
- `config/voices.json` maps each character to a prebuilt voice name plus a style instruction in Spanish (for example Narrador: "voz grave, monótona, de documental serio, español latino neutro").
- Free-tier limits are per project and shown only in AI Studio. The adapter must: generate one line per request, wait between requests, stop cleanly on a quota error (HTTP 429), save progress, and resume later without regenerating finished lines.
- The model is a preview and its free tier can change. Keep the fallback: `pnpm studio handoff <episode> --voices` writes the lines and style instructions so the showrunner can generate them by hand in AI Studio and drop the files in `inbox/`.
- Free-tier requests may be used by Google to improve its products. Scripts are not secret, so this is acceptable here; never send private data.
- Before the first monetized upload, the showrunner reads the current Gemini API terms for commercial use of generated audio.
- Captions: if the provider returns no word timings, align with a local whisper.cpp pass (free, offline).

## Sound effects and music

`pnpm studio sfx find "<description>"` searches Freesound with the licence filter fixed to **Creative Commons 0**, downloads previews for the showrunner to choose, and on choice downloads the file and appends its line to `assets/LICENSES.md` (file, author, URL, licence, date).

Allowed sources:

| Source | Use for | Condition |
|---|---|---|
| Freesound, CC0 filter only | Sound effects | Skip CC BY and CC BY-NC files |
| Own recordings (phone) | Keyboard, can, paper, stamp, clay | Best option for the signature sounds |
| Pixabay | Sound effects and music | For music, skip tracks marked "Content ID Registered"; download the licence certificate with each track |
| YouTube Audio Library | Music | Cleared for YouTube; check each track's terms before using it on TikTok |
| CC0 game-audio packs (for example Kenney, OpenGameArt filtered to CC0) | UI beeps, dings, whooshes | Confirm CC0 on the pack page |

Not allowed: real operating-system sounds, audio ripped from videos, commercial music, CC BY-NC files, any file without a line in `assets/LICENSES.md`.

The `kronos-error`, `kronos-boot` and `kronos-shutdown` jingles are composed for the series (a few notes on a free synth, exported once) so the channel owns them.

## Build-plan changes for this mode

- Phase 2 (voices): implement the Gemini TTS adapter with quota-aware resume, plus the voices handoff fallback.
- Phase 3 (pictures): implement `handoff` and `ingest` first. API adapters for image and video are optional and can be added later if billing is ever enabled.
- Phase 4 (sound): add `sfx find` with the CC0 filter and automatic licence logging.
- Add the `prompt-doctor` agent and `docs/prompt-lessons.md`.
