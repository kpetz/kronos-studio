import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { paths, rootDir } from "../studio/paths";
import type { ImportedEpisode, ImportResult } from "./build";

export interface WriteReport {
  seriesFiles: string[];
  written: string[];
  /** Episode folders left alone because they already hold an episode.json. */
  skipped: string[];
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

export function renderScriptMd({ episode, scriptRows }: ImportedEpisode): string {
  const label = episode.series === "miniserie" ? "Parte" : "Ep.";
  const lines = [
    `# ${label} ${episode.number} — ${episode.title}`,
    "",
    "Imported from the showrunner's Sheet with `pnpm studio import`. Original timing; the target is " +
      `${episode.targetDurationSec[0]}–${episode.targetDurationSec[1]} s.`,
    "",
    "| Tiempo | Visual | Voces | SFX | Texto en pantalla |",
    "|---|---|---|---|---|",
    ...scriptRows.map(
      (r) =>
        `| ${cell(r.time)} | ${cell(r.visual)} | ${cell(r.voices)} | ${cell(r.sfx)} | ${cell(r.text)} |`,
    ),
    "",
  ];
  return lines.join("\n");
}

/**
 * Writes data/series/*.json and one folder per episode. An episode folder that
 * already has an episode.json is never overwritten unless `force` is set, so
 * re-importing cannot destroy production work.
 */
export function writeImport(
  result: ImportResult,
  options: { root?: string; force?: boolean } = {},
): WriteReport {
  const root = options.root ?? rootDir();
  const rel = (p: string) => relative(root, p);
  const report: WriteReport = { seriesFiles: [], written: [], skipped: [] };

  const seriesDir = paths.series(root);
  mkdirSync(seriesDir, { recursive: true });
  const seriesFiles: Array<[string, unknown]> = [
    ["characters.json", result.characters.length > 0 ? result.characters : null],
    ["sounds.json", result.sounds.length > 0 ? result.sounds : null],
    ["checklist.json", result.checklist.length > 0 ? result.checklist : null],
    ["structure.json", result.structure],
  ];
  for (const [name, data] of seriesFiles) {
    if (data == null) continue;
    const file = join(seriesDir, name);
    writeJson(file, data);
    report.seriesFiles.push(rel(file));
  }

  for (const imported of result.episodes) {
    const dir = join(paths.episodes(root), imported.episode.series, imported.slug);
    const file = join(dir, "episode.json");
    if (existsSync(file) && !options.force) {
      report.skipped.push(rel(dir));
      continue;
    }
    mkdirSync(dir, { recursive: true });
    writeJson(file, imported.episode);
    writeFileSync(join(dir, "script.md"), renderScriptMd(imported));
    report.written.push(rel(dir));
  }
  return report;
}
