import { z } from "zod";

/** Production states, in order. Only the showrunner moves an episode into an approved state. */
export const STATUSES = [
  "draft",
  "script_approved",
  "storyboard_approved",
  "assets_ready",
  "rendered",
  "qa_passed",
  "cut_approved",
  "published",
] as const;

export const ON_SCREEN_TEXT_STYLES = [
  "tag", // episode or part number, first shot
  "recap", // "Anteriormente..."
  "question", // cliffhanger question
  "continuara", // "Continuará..." card
  "stamp", // "DATO REAL"
  "screen", // text shown on a prop: monitor, paper, camera feed, sign
  "caption",
] as const;

/**
 * Where a sound cue sits. "start"/"end" are relative to the beat; the object form
 * anchors to a line or shot so the cue survives retiming.
 */
export const SfxAtSchema = z.union([
  z.enum(["start", "end"]),
  z
    .object({
      ref: z.string().min(1),
      position: z.enum(["before", "on", "after"]),
      offsetSec: z.number(),
    })
    .strict(),
]);

export const LineSchema = z
  .object({
    id: z.string().min(1),
    speaker: z.string().min(1),
    /** Text as shown in captions. */
    text: z.string().min(1),
    /** Text as sent to speech synthesis (numbers spelled out, etc.). */
    ttsText: z.string().nullable().optional(),
    direction: z.string().nullable(),
    audio: z.string().nullable(),
    durationSec: z.number().positive().nullable(),
  })
  .strict();

export const SfxCueSchema = z
  .object({
    id: z.string().min(1),
    at: SfxAtSchema,
    /** Variation asked for by the script, e.g. "cortado a la mitad". */
    note: z.string().optional(),
  })
  .strict();

export const SfxExtraSchema = z
  .object({
    id: z.string().min(1),
    description: z.string().min(1),
    file: z.string().nullable().optional(),
  })
  .strict();

export const OnScreenTextSchema = z
  .object({
    text: z.string().min(1),
    style: z.enum(ON_SCREEN_TEXT_STYLES),
  })
  .strict();

export const ShotSchema = z
  .object({
    id: z.string().min(1),
    /** A = animated still, B = image-to-video. */
    type: z.enum(["A", "B"]),
    framing: z.string(),
    characters: z.array(z.string()),
    set: z.string(),
    prompt: z.string(),
    motionPrompt: z.string().nullable(),
    poses: z.array(z.string()),
    video: z.string().nullable(),
    durationSec: z.number().positive(),
    assetHash: z.string().nullable(),
    qa: z
      .object({
        result: z.enum(["pass", "fail"]),
        reason: z.string().optional(),
        checkedAt: z.string().optional(),
      })
      .strict()
      .nullable(),
    /** True when the shot is only a Remotion overlay (screen, email, sign, stamp). */
    overlay: z.boolean().optional(),
    /** One line on why a type B shot is worth a clip. */
    justification: z.string().optional(),
    /** Written by `studio ingest` for handoff-generated files. */
    ingest: z
      .object({
        promptUsed: z.string(),
        date: z.string(),
        sourceFile: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const BeatSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    visual: z.string(),
    /** Timing from the showrunner's original script. Informational only. */
    source: z
      .object({ time: z.string(), startSec: z.number(), endSec: z.number() })
      .strict()
      .optional(),
    lines: z.array(LineSchema),
    sfx: z.array(SfxCueSchema),
    onScreenText: z.array(OnScreenTextSchema),
    shots: z.array(ShotSchema),
  })
  .strict();

export const PublishSchema = z
  .object({
    coverText: z.string(),
    youtubeTitle: z.string(),
    tiktokDescription: z.string(),
    hashtags: z.array(z.string()),
    pinnedComment: z.string(),
    published: z
      .object({
        youtubeUrl: z.string().nullable(),
        tiktokUrl: z.string().nullable(),
        date: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const EpisodeSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+-\d{2}$/),
    series: z.string().min(1),
    number: z.number().int().positive(),
    title: z.string().min(1),
    status: z.enum(STATUSES),
    targetDurationSec: z.tuple([z.number().positive(), z.number().positive()]),
    /** Season 1 only: the real tip, with a source URL. */
    tip: z
      .object({
        text: z.string().min(1),
        steps: z.array(z.string()).optional(),
        source: z.string().nullable(),
      })
      .strict()
      .nullable(),
    /** Miniseries only: the question left on screen. */
    cliffhanger: z.string().nullable().optional(),
    /** Miniseries only: what the ending shows, from the publish sheet. */
    cliffhangerNote: z.string().optional(),
    beats: z.array(BeatSchema).min(1),
    /** Sounds this episode needs beyond the recurring ones in data/series/sounds.json. */
    sfxExtra: z.array(SfxExtraSchema).optional(),
    publish: PublishSchema,
    costs: z
      .object({ estimated: z.number().nullable(), actual: z.number().nullable() })
      .strict(),
  })
  .strict();

export type Status = (typeof STATUSES)[number];
export type Line = z.infer<typeof LineSchema>;
export type SfxCue = z.infer<typeof SfxCueSchema>;
export type SfxExtra = z.infer<typeof SfxExtraSchema>;
export type OnScreenText = z.infer<typeof OnScreenTextSchema>;
export type Shot = z.infer<typeof ShotSchema>;
export type Beat = z.infer<typeof BeatSchema>;
export type Episode = z.infer<typeof EpisodeSchema>;
