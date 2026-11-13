# Pipeline

## Stages

| # | Stage | Agent | Input | Output | Gate |
|---|---|---|---|---|---|
| 0 | Trend and topic research | `trend-scout` | niche, past performance | `research/topics-<date>.md` | — |
| 1 | Script | `scriptwriter` | topic, bible | `script.md`, `episode.json` (beats) | — |
| 2 | Critique | `script-critic` | script | `critique.md`, verdict | **Gate 1** showrunner approves script |
| 3 | Storyboard | `storyboard-artist` | approved script, style guide | shots + prompts in `episode.json` | **Gate 2** showrunner approves shots and cost |
| 4a | Voices | `voice-director` | lines | `audio/vo/*.wav`, timings | — |
| 4b | Pictures | `storyboard-artist` | prompts | `shots/*.png`, `shots/*.mp4` | — |
| 4c | Sound | `sound-designer` | cues | `audio/mix-plan.json` | — |
| 5 | Assembly | `editor` | all assets | `out/<ep>-vertical.mp4` | — |
| 6 | QA | `qa-casandra` | render, checklist | `qa.md` pass/fail | **Gate 3** showrunner approves cut |
| 7 | Publish pack | `publisher` | final cut | `publish/` (cover, titles, descriptions, tags, pinned comment) | **Gate 4** showrunner uploads |
| 8 | Season compile | `editor` | approved episodes | `out/<season>-wide.mp4` + chapters | Gate 3 and 4 again |

Stages 4a, 4b and 4c run in parallel. Everything else is sequential.

## Episode folder

```
episodes/miniserie/01-lunes-859/
  episode.json        state and all structured data
  script.md           human-readable script
  critique.md
  shots/              s01.png, s01-b.png, s04.mp4 ...
  audio/vo/           b01-narrador-01.wav ...
  audio/mix-plan.json
  publish/            cover.png, youtube.md, tiktok.md
  qa.md
```

## `episode.json`

```jsonc
{
  "id": "miniserie-01",
  "series": "miniserie",            // "s1" | "miniserie" | "s2" ...
  "number": 1,
  "title": "Lunes, 8:59",
  "status": "draft",                // draft → script_approved → storyboard_approved
                                    // → assets_ready → rendered → qa_passed
                                    // → cut_approved → published
  "targetDurationSec": [62, 70],
  "tip": null,                      // S1 only: the real tip, with a source URL
  "cliffhanger": "¿Fue el Junior?", // miniseries only
  "beats": [
    {
      "id": "b01",
      "name": "gancho",
      "visual": "Oficina a oscuras. El monitor de Kronos está negro...",
      "lines": [
        { "id": "b01-l01", "speaker": "narrador",
          "text": "Lunes, 8:59. Kronos no respondió. Nunca había pasado.",
          "direction": "grave, sin emoción", "audio": null, "durationSec": null }
      ],
      "sfx": [ { "id": "zumbido-apagado", "at": "start" } ],
      "onScreenText": [ { "text": "Parte 1 de 6", "style": "tag" } ],
      "shots": [
        {
          "id": "s01", "type": "A",          // A = animated still, B = image-to-video
          "framing": "wide", "characters": ["kronos"], "set": "oficina-noche",
          "prompt": "...", "motionPrompt": null,
          "poses": ["s01.png"], "video": null,
          "durationSec": 3, "assetHash": null, "qa": null
        }
      ]
    }
  ],
  "publish": { "coverText": "", "youtubeTitle": "", "tiktokDescription": "",
               "hashtags": [], "pinnedComment": "" },
  "costs": { "estimated": null, "actual": null }
}
```

Rules:
- Durations come from the real voice files, never from the script estimate. The editor times shots to the audio.
- `assetHash` = hash of prompt + reference images + provider settings. Same hash, no regeneration.
- `speaker` and `characters` values must exist in `data/series/characters.json`. `sfx.id` must exist in `data/series/sounds.json` or in the episode's own `sfx-extra` list.

Optional fields the schema (`src/schemas/episode.ts`) also accepts:

| Field | Where | Written by |
|---|---|---|
| `ttsText` | line | `voice-director`: the spoken form of the text (numbers as words) |
| `tip.text`, `tip.steps`, `tip.source` | episode | `scriptwriter`: the real tip and its source URL |
| `cliffhangerNote` | episode | importer: what the ending shows |
| `sfxExtra[]` (`id`, `description`, `file`) | episode | importer, `sound-designer`: sounds beyond the recurring ones |
| `sfx.note` | cue | a variation of a recurring sound ("cortado a la mitad") |
| `sfx.at` as `{ ref, position, offsetSec }` | cue | `sound-designer`: anchor to a line or shot id; `"start"`/`"end"` mean the beat |
| `source` (`time`, `startSec`, `endSec`) | beat | importer: timing in the original script |
| `overlay`, `justification`, `ingest` | shot | `storyboard-artist`, `studio ingest` |
| `publish.published` | episode | `publisher`: URLs and date after upload |

`onScreenText.style` is one of `tag`, `recap`, `question`, `continuara`, `stamp`, `screen`, `caption`.

## Audio mix targets

- Voice is the reference. Music sits about 18 dB under voice and ducks further under dialogue.
- SFX never mask a punchline word.
- Final loudness about -14 LUFS integrated, true peak under -1 dB.

## Long video (season compile)

- Use the wide masters, not the vertical crops.
- Remove per-episode recaps ("Anteriormente...") and "Continuará..." cards; replace with a short stinger between parts.
- Add a cold open (the best 10 seconds), a title card, chapters by episode, and an end card.
- For Season 1, group the ten stand-alone episodes under a light framing device (for example Casandra's incident log) so the compile is more than ten shorts in a row.
