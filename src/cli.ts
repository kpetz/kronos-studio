import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { buildSeries } from "./importer/build";
import { writeImport } from "./importer/write";
import { readXlsx } from "./importer/xlsx";
import { paths, rootDir } from "./studio/paths";
import { parseFormat, prepareRender, previewEpisode, renderEpisode, timingSummary } from "./studio/render";
import { validateProject } from "./studio/validate";

/** Commands named in CLAUDE.md that later build phases add. */
const PLANNED: Record<string, string> = {
  estimate: "Phase 2",
  voices: "Phase 2",
  handoff: "Phase 3",
  ingest: "Phase 3",
  images: "Phase 3",
  video: "Phase 3",
  sound: "Phase 4",
  sfx: "Phase 4",
  "publish-pack": "Phase 5",
  compile: "Phase 5",
};

function runImport(args: string[]): number {
  const root = rootDir();
  const source = paths.source(root);
  if (!existsSync(source)) {
    console.error(`Source workbook not found: ${relative(root, source)}`);
    return 1;
  }
  const result = buildSeries(readXlsx(source));
  const report = writeImport(result, { root, force: args.includes("--force") });

  console.log(`Imported ${relative(root, source)}`);
  console.log(`  characters: ${result.characters.length}   sounds: ${result.sounds.length}   checklist items: ${result.checklist.length}`);
  console.log(`  series files: ${report.seriesFiles.join(", ") || "none"}`);
  console.log(`  episodes written: ${report.written.length}`);
  for (const dir of report.written) console.log(`    + ${dir}`);
  if (report.skipped.length > 0) {
    console.log(`  episodes skipped (already exist; use --force to overwrite): ${report.skipped.length}`);
    for (const dir of report.skipped) console.log(`    = ${dir}`);
  }
  if (result.missingSheets.length > 0) {
    console.log(`\nSheets not found in the workbook:`);
    for (const name of result.missingSheets) console.log(`  - ${name}`);
  }
  if (result.warnings.length > 0) {
    console.log(`\nNeeds a look:`);
    for (const w of result.warnings) console.log(`  - ${w}`);
  }
  return 0;
}

function runValidate(args: string[]): number {
  const root = rootDir();
  const query = args.find((a) => !a.startsWith("--"));
  const report = validateProject(query, root);

  for (const e of report.project.errors) console.log(`ERROR  ${e}`);
  for (const w of report.project.warnings) console.log(`warn   ${w}`);
  for (const ep of report.episodes) {
    const verdict = ep.errors.length > 0 ? "FAIL" : "ok";
    const stats = ep.stats
      ? `  ${ep.stats.lines} lines, ${ep.stats.words} words, speech ≈ ${ep.stats.speechSec.toFixed(0)} s` +
        (ep.stats.sourceSec != null ? `, script timing ${ep.stats.sourceSec} s` : "")
      : "";
    console.log(`${verdict.padEnd(5)}${ep.id}${stats}`);
    for (const e of ep.errors) console.log(`  ERROR  ${e}`);
    for (const w of ep.warnings) console.log(`  warn   ${w}`);
  }
  const errors = report.project.errors.length + report.episodes.reduce((n, e) => n + e.errors.length, 0);
  const warnings = report.project.warnings.length + report.episodes.reduce((n, e) => n + e.warnings.length, 0);
  console.log(`\n${report.episodes.length} episode(s), ${errors} error(s), ${warnings} warning(s)`);
  return report.ok ? 0 : 1;
}

function runRender(args: string[], preview: boolean): number {
  const root = rootDir();
  const query = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--format");
  if (!query) {
    console.error(`Usage: pnpm studio ${preview ? "preview" : "render"} <episode> [--format vertical|wide]`);
    return 1;
  }
  let prepared;
  try {
    prepared = prepareRender(query, parseFormat(args), root);
  } catch (e) {
    console.error((e as Error).message);
    return 1;
  }
  const { episode, format } = prepared.props;
  console.log(`${episode.id} "${episode.title}" — ${format}, status ${episode.status}`);
  for (const line of timingSummary(prepared)) console.log(line);
  if (prepared.timeline.beats.every((b) => b.shots.every((s) => !s.shot))) {
    console.log("  no storyboard yet: every beat renders as a placeholder card (animatic)");
  }
  if (preview) return previewEpisode(prepared, root);

  const code = renderEpisode(prepared, root);
  if (code !== 0) {
    console.error(`Render failed (exit ${code}).`);
    return code;
  }
  console.log(`\nRendered ${relative(root, prepared.outFile)}`);
  return 0;
}

function main(): number {
  // Machine settings and keys live in .env, which is never committed.
  const envFile = join(rootDir(), ".env");
  if (existsSync(envFile)) process.loadEnvFile(envFile);
  const [command, ...args] = process.argv.slice(2);
  switch (command) {
    case "import":
      return runImport(args);
    case "validate":
      return runValidate(args);
    case "render":
      return runRender(args, false);
    case "preview":
      return runRender(args, true);
    case undefined:
    case "help":
    case "--help":
      console.log("Usage: pnpm studio <command>\n");
      console.log("  import [--force]      xlsx → data/series/*.json and episode folders");
      console.log("  validate [episode]    schema and canon checks (all episodes when omitted)");
      console.log("  render <episode> [--format vertical|wide]   render to out/<id>-<format>.mp4");
      console.log("  preview <episode> [--format vertical|wide]  open the episode in Remotion Studio");
      console.log(`\nNot built yet: ${Object.keys(PLANNED).join(", ")}`);
      return 0;
    default:
      if (PLANNED[command]) {
        console.error(`"${command}" is not built yet (${PLANNED[command]} of docs/BUILD_PLAN.md).`);
      } else {
        console.error(`Unknown command "${command}". Run: pnpm studio help`);
      }
      return 1;
  }
}

process.exit(main());
