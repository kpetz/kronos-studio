import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { Episode } from "../schemas/episode";
import { validateProject } from "./validate";

function project(): { root: string; file: string; episode: Episode } {
  const root = mkdtempSync(join(tmpdir(), "kronos-validate-"));
  cpSync(join(process.cwd(), "config"), join(root, "config"), { recursive: true });
  const series = join(root, "data/series");
  const dir = join(root, "episodes/miniserie/01-lunes-859");
  mkdirSync(series, { recursive: true });
  writeFileSync(
    join(series, "characters.json"),
    JSON.stringify(
      ["narrador", "kronos", "junior", "jefe", "casandra", "cliente", "legal", "impresora"].map((id) => ({
        id,
        name: id,
        role: "",
        look: "",
        voice: "",
        catchphrase: "",
        speaks: id !== "impresora",
        appears: id !== "narrador",
      })),
    ),
  );
  writeFileSync(
    join(series, "sounds.json"),
    JSON.stringify([{ id: "teclado", name: "Teclado mecánico", when: "", origin: "sheet" }]),
  );
  const episode: Episode = {
    id: "miniserie-01",
    series: "miniserie",
    number: 1,
    title: "Lunes, 8:59",
    status: "draft",
    targetDurationSec: [62, 70],
    tip: null,
    cliffhanger: "¿Fue el Junior?",
    beats: [
      {
        id: "b01",
        name: "gancho",
        visual: "Oficina a oscuras.",
        source: { time: "0:00–1:05", startSec: 0, endSec: 65 },
        lines: [
          { id: "b01-l01", speaker: "narrador", text: "Kronos no respondió.", direction: null, audio: null, durationSec: null },
        ],
        sfx: [{ id: "teclado", at: "start" }],
        onScreenText: [{ text: "Parte 1 de 6", style: "tag" }],
        shots: [],
      },
    ],
    publish: { coverText: "", youtubeTitle: "", tiktokDescription: "", hashtags: [], pinnedComment: "" },
    costs: { estimated: null, actual: null },
  };
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "episode.json");
  writeFileSync(file, JSON.stringify(episode));
  return { root, file, episode };
}

function rewrite(file: string, change: (episode: any) => void): void {
  const data = JSON.parse(readFileSync(file, "utf8"));
  change(data);
  writeFileSync(file, JSON.stringify(data));
}

describe("validateProject", () => {
  it("passes a well-formed episode", () => {
    const { root } = project();
    const report = validateProject("miniserie-01", root);
    expect(report.project.errors).toEqual([]);
    expect(report.episodes[0]?.errors).toEqual([]);
    expect(report.episodes[0]?.warnings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("rejects a status that does not exist", () => {
    const { root, file } = project();
    rewrite(file, (e) => (e.status = "approved"));
    const report = validateProject(undefined, root);
    expect(report.ok).toBe(false);
    expect(report.episodes[0]?.errors[0]).toContain("status");
  });

  it("rejects speakers, sounds and characters that are not canon", () => {
    const { root, file } = project();
    rewrite(file, (e) => {
      e.beats[0].lines[0].speaker = "hermes";
      e.beats[0].lines.push({ id: "b01-l02", speaker: "impresora", text: "Grr.", direction: null, audio: null, durationSec: null });
      e.beats[0].sfx.push({ id: "bocina", at: "start" });
      e.beats[0].sfx.push({ id: "teclado", at: { ref: "b09-l01", position: "on", offsetSec: 0 } });
      e.beats[0].shots.push({
        id: "s01", type: "B", framing: "wide", characters: ["narrador"], set: "oficina-noche",
        prompt: "", motionPrompt: null, poses: [], video: null, durationSec: 9, assetHash: null, qa: null,
      });
    });
    const errors = validateProject("miniserie-01", root).episodes[0]!.errors.join("\n");
    expect(errors).toContain('speaker "hermes" is not in characters.json');
    expect(errors).toContain('"impresora" never speaks');
    expect(errors).toContain('sound "bocina" is not in sounds.json or sfxExtra');
    expect(errors).toContain('anchored to unknown id "b09-l01"');
    expect(errors).toContain('"narrador" never appears on screen');
    expect(errors).toContain("over the 8 s limit");
  });

  it("warns about brand names, long lines and timing outside the target", () => {
    const { root, file } = project();
    rewrite(file, (e) => {
      e.beats[0].onScreenText.push({ text: "Reinstala Windows.", style: "screen" });
      e.beats[0].lines[0].text = "uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince";
      e.beats[0].source.endSec = 55;
    });
    const report = validateProject("miniserie-01", root);
    const warnings = report.episodes[0]!.warnings.join("\n");
    expect(report.ok).toBe(true);
    expect(warnings).toContain('real brand name "windows"');
    expect(warnings).toContain("15 words");
    expect(warnings).toContain("script timing is 55 s");
  });

  it("reports an episode that does not exist", () => {
    const { root } = project();
    const report = validateProject("s1-04", root);
    expect(report.ok).toBe(false);
    expect(report.project.errors[0]).toContain("not found");
  });
});
