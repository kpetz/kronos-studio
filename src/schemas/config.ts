import { z } from "zod";

/** config/voices.json — one entry per speaking character. */
export const VoicesConfigSchema = z
  .object({
    voices: z.record(
      z.string(),
      z
        .object({
          /** Provider voice name. null until the showrunner picks one. */
          voiceName: z.string().nullable(),
          /** Style instruction sent with every line, in Spanish. */
          style: z.string().min(1),
          /** Named FFmpeg effect chains applied after synthesis. */
          effects: z.array(z.string()).optional(),
        })
        .strict(),
    ),
  })
  .strict();

/** config/providers.json — which adapter produces each asset type, and what it costs. */
export const ProvidersConfigSchema = z
  .object({
    voice: z
      .object({
        provider: z.enum(["gemini-tts", "handoff"]),
        model: z.string().nullable(),
        requestDelayMs: z.number().int().nonnegative(),
      })
      .strict(),
    image: z
      .object({
        provider: z.enum(["handoff"]),
        /** Flow / Nano Banana credits per still, from the showrunner's plan page. */
        creditsPerStill: z.number().nonnegative().nullable(),
      })
      .strict(),
    video: z
      .object({
        provider: z.enum(["handoff"]),
        creditsPerClip: z.number().nonnegative().nullable(),
        maxClipSec: z.number().positive(),
        maxClipsPerEpisode: z.number().int().positive(),
      })
      .strict(),
  })
  .strict();

const FormatSchema = z
  .object({ width: z.number().int().positive(), height: z.number().int().positive() })
  .strict();

/** config/render.json — formats, caption safe zone and mix targets. */
export const RenderConfigSchema = z
  .object({
    fps: z.number().int().positive(),
    formats: z.object({ vertical: FormatSchema, wide: FormatSchema }).strict(),
    /** Fractions of the frame height (vertical format). */
    captionSafeZone: z.object({ top: z.number(), bottom: z.number() }).strict(),
    audio: z
      .object({
        loudnessLufs: z.number(),
        truePeakDb: z.number(),
        musicUnderVoiceDb: z.number(),
      })
      .strict(),
    /** Speaking rate used for duration estimates before real voices exist. */
    wordsPerSecond: z.number().positive(),
  })
  .strict();

export type VoicesConfig = z.infer<typeof VoicesConfigSchema>;
export type ProvidersConfig = z.infer<typeof ProvidersConfigSchema>;
export type RenderConfig = z.infer<typeof RenderConfigSchema>;
