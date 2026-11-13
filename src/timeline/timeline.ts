import type { Episode, OnScreenText, SfxCue, Shot } from "../schemas/episode";

/** Pauses used when laying lines out inside a beat, in seconds. */
const LEAD_IN_SEC = 0.3;
const GAP_SEC = 0.25;
const TAIL_SEC = 0.5;
/** A spoken line never gets less than this, however short. */
const MIN_LINE_SEC = 0.6;
/** Captions show 3–5 words at a time (style guide). */
const WORDS_PER_CHUNK = 4;

export interface TimedWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

export interface CaptionChunk {
  startFrame: number;
  endFrame: number;
  words: TimedWord[];
}

export interface TimedLine {
  id: string;
  speaker: string;
  text: string;
  startFrame: number;
  endFrame: number;
  /** True while the duration is a word-count estimate, not a real voice file. */
  estimated: boolean;
  chunks: CaptionChunk[];
}

export interface TimedShot {
  id: string;
  startFrame: number;
  endFrame: number;
  /** null when the beat has no storyboard yet; the whole beat is one placeholder. */
  shot: Shot | null;
}

export interface TimedBeat {
  id: string;
  name: string;
  visual: string;
  startFrame: number;
  endFrame: number;
  lines: TimedLine[];
  shots: TimedShot[];
  onScreenText: OnScreenText[];
  sfx: SfxCue[];
}

export interface Timeline {
  fps: number;
  durationInFrames: number;
  durationSec: number;
  /** True when any line is still timed by estimate. */
  estimated: boolean;
  beats: TimedBeat[];
}

export interface TimelineOptions {
  fps: number;
  wordsPerSecond: number;
}

export function spokenWords(text: string): string[] {
  return text.split(/\s+/).filter((w) => w.length > 0);
}

/** Seconds a line takes: the real voice file when it exists, else a word-count estimate. */
export function lineSeconds(
  line: { text: string; durationSec: number | null },
  wordsPerSecond: number,
): number {
  if (line.durationSec != null) return line.durationSec;
  const words = spokenWords(line.text).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  return Math.max(MIN_LINE_SEC, words / wordsPerSecond);
}

/** Splits words into groups of 3–5 where the line is long enough, as even as possible. */
export function chunkWords(words: string[]): string[][] {
  if (words.length === 0) return [];
  const count = Math.ceil(words.length / WORDS_PER_CHUNK);
  const chunks: string[][] = [];
  let index = 0;
  for (let i = 0; i < count; i++) {
    const size = Math.ceil((words.length - index) / (count - i));
    chunks.push(words.slice(index, index + size));
    index += size;
  }
  return chunks;
}

/** Word timings spread over the line in proportion to word length. */
function timeChunks(text: string, startFrame: number, endFrame: number): CaptionChunk[] {
  const words = spokenWords(text);
  const weights = words.map((w) => w.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = endFrame - startFrame;

  const timed: TimedWord[] = [];
  let acc = 0;
  for (let i = 0; i < words.length; i++) {
    const from = startFrame + Math.round((acc / total) * span);
    acc += weights[i]!;
    const to = startFrame + Math.round((acc / total) * span);
    timed.push({ text: words[i]!, startFrame: from, endFrame: to });
  }

  const chunks: CaptionChunk[] = [];
  let index = 0;
  for (const group of chunkWords(words)) {
    const slice = timed.slice(index, index + group.length);
    index += group.length;
    chunks.push({
      startFrame: slice[0]!.startFrame,
      endFrame: slice.at(-1)!.endFrame,
      words: slice,
    });
  }
  return chunks;
}

/**
 * Lays an episode out on a frame timeline.
 *
 * A beat lasts as long as the longest of: its speech with pauses, its shots, or
 * (only while there is no storyboard) the timing written in the original script.
 * Spare time is shared out evenly between the lines.
 */
export function buildTimeline(episode: Episode, options: TimelineOptions): Timeline {
  const { fps, wordsPerSecond } = options;
  const frames = (sec: number) => Math.round(sec * fps);
  const beats: TimedBeat[] = [];
  let cursor = 0;
  let estimated = false;

  for (const beat of episode.beats) {
    const durations = beat.lines.map((line) => lineSeconds(line, wordsPerSecond));
    const speech = durations.reduce((a, b) => a + b, 0);
    const gaps = Math.max(0, beat.lines.length - 1) * GAP_SEC;
    const speechSpan = beat.lines.length > 0 ? LEAD_IN_SEC + speech + gaps + TAIL_SEC : 0;
    const shotsSpan = beat.shots.reduce((sum, s) => sum + s.durationSec, 0);
    const sourceSpan =
      beat.shots.length === 0 && beat.source ? beat.source.endSec - beat.source.startSec : 0;
    const beatSec = Math.max(speechSpan, shotsSpan, sourceSpan, 1);

    const startFrame = cursor;
    const endFrame = cursor + Math.max(1, frames(beatSec));

    // Share the spare time between the pauses before, between and after lines.
    const slack = Math.max(0, beatSec - speechSpan) / (beat.lines.length + 1);
    const lines: TimedLine[] = [];
    let at = LEAD_IN_SEC + slack;
    beat.lines.forEach((line, i) => {
      const from = startFrame + frames(at);
      const to = Math.min(endFrame, Math.max(from + 1, startFrame + frames(at + durations[i]!)));
      const isEstimate = line.durationSec == null;
      if (isEstimate) estimated = true;
      lines.push({
        id: line.id,
        speaker: line.speaker,
        text: line.text,
        startFrame: from,
        endFrame: to,
        estimated: isEstimate,
        chunks: timeChunks(line.text, from, to),
      });
      at += durations[i]! + GAP_SEC + slack;
    });

    const shots: TimedShot[] = [];
    if (beat.shots.length === 0) {
      shots.push({ id: beat.id, startFrame, endFrame, shot: null });
    } else {
      const scale = beatSec / shotsSpan;
      let shotAt = 0;
      beat.shots.forEach((shot, i) => {
        const from = startFrame + frames(shotAt);
        shotAt += shot.durationSec * scale;
        const to = i === beat.shots.length - 1 ? endFrame : startFrame + frames(shotAt);
        shots.push({ id: shot.id, startFrame: from, endFrame: Math.max(from + 1, to), shot });
      });
    }

    beats.push({
      id: beat.id,
      name: beat.name,
      visual: beat.visual,
      startFrame,
      endFrame,
      lines,
      shots,
      onScreenText: beat.onScreenText,
      sfx: beat.sfx,
    });
    cursor = endFrame;
  }

  return { fps, durationInFrames: cursor, durationSec: cursor / fps, estimated, beats };
}

export type DurationVerdict = "under" | "inside" | "over";

export function durationVerdict(durationSec: number, target: [number, number]): DurationVerdict {
  if (durationSec < target[0]) return "under";
  if (durationSec > target[1]) return "over";
  return "inside";
}
