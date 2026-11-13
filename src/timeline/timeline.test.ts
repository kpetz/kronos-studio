import { describe, expect, it } from "vitest";
import type { Beat, Episode, Shot } from "../schemas/episode";
import { buildTimeline, chunkWords, durationVerdict, lineSeconds } from "./timeline";

const options = { fps: 24, wordsPerSecond: 2.6 };

function line(id: string, text: string, durationSec: number | null = null) {
  return { id, speaker: "narrador", text, direction: null, audio: null, durationSec };
}

function shot(id: string, durationSec: number): Shot {
  return {
    id, type: "A", framing: "wide", characters: [], set: "oficina", prompt: "", motionPrompt: null,
    poses: [], video: null, durationSec, assetHash: null, qa: null,
  };
}

function episode(beats: Beat[]): Episode {
  return {
    id: "miniserie-01", series: "miniserie", number: 1, title: "Prueba", status: "draft",
    targetDurationSec: [62, 70], tip: null, beats,
    publish: { coverText: "", youtubeTitle: "", tiktokDescription: "", hashtags: [], pinnedComment: "" },
    costs: { estimated: null, actual: null },
  };
}

function beat(id: string, partial: Partial<Beat>): Beat {
  return { id, name: "desarrollo", visual: "", lines: [], sfx: [], onScreenText: [], shots: [], ...partial };
}

describe("lineSeconds", () => {
  it("estimates from the word count", () => {
    expect(lineSeconds(line("l", "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece"), 2.6)).toBeCloseTo(5);
  });
  it("never goes under the minimum", () => {
    expect(lineSeconds(line("l", "¿Kronos?"), 2.6)).toBe(0.6);
  });
  it("uses the real voice file when there is one", () => {
    expect(lineSeconds(line("l", "uno dos tres", 4.2), 2.6)).toBe(4.2);
  });
});

describe("chunkWords", () => {
  it("keeps captions to 3–5 words when the line allows it", () => {
    const sizes = (n: number) => chunkWords(Array.from({ length: n }, (_, i) => `w${i}`)).map((c) => c.length);
    expect(sizes(2)).toEqual([2]);
    expect(sizes(4)).toEqual([4]);
    expect(sizes(5)).toEqual([3, 2]);
    expect(sizes(9)).toEqual([3, 3, 3]);
    expect(sizes(14)).toEqual([4, 4, 3, 3]);
    for (let n = 6; n <= 40; n++) {
      for (const size of sizes(n)) {
        expect(size).toBeGreaterThanOrEqual(3);
        expect(size).toBeLessThanOrEqual(5);
      }
    }
  });
});

describe("buildTimeline", () => {
  it("uses the script timing while there is no storyboard", () => {
    const t = buildTimeline(
      episode([
        beat("b01", { source: { time: "0:00–0:03", startSec: 0, endSec: 3 }, lines: [line("b01-l01", "Kronos no respondió.")] }),
        beat("b02", { source: { time: "0:03–0:10", startSec: 3, endSec: 10 }, lines: [line("b02-l01", "Hola.")] }),
      ]),
      options,
    );
    expect(t.beats.map((b) => [b.startFrame, b.endFrame])).toEqual([[0, 72], [72, 240]]);
    expect(t.durationInFrames).toBe(240);
    expect(t.durationSec).toBe(10);
    expect(t.estimated).toBe(true);
    expect(t.beats[0]!.shots).toEqual([{ id: "b01", startFrame: 0, endFrame: 72, shot: null }]);
  });

  it("stretches a beat whose speech does not fit the script timing", () => {
    const long = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece";
    const t = buildTimeline(
      episode([beat("b01", { source: { time: "0:00–0:03", startSec: 0, endSec: 3 }, lines: [line("b01-l01", long)] })]),
      options,
    );
    // 0.3 lead-in + 5 s speech + 0.5 tail
    expect(t.durationSec).toBeCloseTo(5.8, 1);
  });

  it("keeps lines in order, inside their beat and without overlap", () => {
    const t = buildTimeline(
      episode([
        beat("b01", {
          source: { time: "0:00–0:09", startSec: 0, endSec: 9 },
          lines: [line("a", "Nadie sale de esta oficina."), line("b", "¡Yo estaba en mi casa!"), line("c", "¡Yo también!")],
        }),
      ]),
      options,
    );
    const b = t.beats[0]!;
    let previousEnd = b.startFrame;
    for (const l of b.lines) {
      expect(l.startFrame).toBeGreaterThanOrEqual(previousEnd);
      expect(l.endFrame).toBeGreaterThan(l.startFrame);
      expect(l.endFrame).toBeLessThanOrEqual(b.endFrame);
      previousEnd = l.endFrame;
    }
  });

  it("times caption words to cover the whole line", () => {
    const t = buildTimeline(
      episode([beat("b01", { lines: [line("a", "Alguien en esta oficina desenchufó a Kronos. Para siempre.", 4)] })]),
      options,
    );
    const l = t.beats[0]!.lines[0]!;
    const words = l.chunks.flatMap((c) => c.words);
    expect(words.map((w) => w.text).join(" ")).toBe(l.text);
    expect(words[0]!.startFrame).toBe(l.startFrame);
    expect(words.at(-1)!.endFrame).toBe(l.endFrame);
    expect(l.chunks.map((c) => c.words.length)).toEqual([3, 3, 3]);
    expect(l.endFrame - l.startFrame).toBe(96);
    expect(t.estimated).toBe(false);
  });

  it("times shots to the beat once a storyboard exists and ignores the script timing", () => {
    const t = buildTimeline(
      episode([
        beat("b01", {
          source: { time: "0:00–0:20", startSec: 0, endSec: 20 },
          lines: [line("a", "uno dos tres", 7.2)],
          shots: [shot("s01", 2), shot("s02", 2)],
        }),
      ]),
      options,
    );
    // Speech needs 0.3 + 7.2 + 0.5 = 8 s; the two 2 s shots stretch to fill it.
    expect(t.durationInFrames).toBe(192);
    expect(t.beats[0]!.shots.map((s) => [s.id, s.startFrame, s.endFrame])).toEqual([
      ["s01", 0, 96],
      ["s02", 96, 192],
    ]);
  });
});

describe("durationVerdict", () => {
  it("compares with the target window", () => {
    expect(durationVerdict(55, [62, 70])).toBe("under");
    expect(durationVerdict(62, [62, 70])).toBe("inside");
    expect(durationVerdict(70.1, [62, 70])).toBe("over");
  });
});
