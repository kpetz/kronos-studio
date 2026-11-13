import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { EpisodeProps, RenderFormat } from "../remotion/props";
import { RenderConfigSchema } from "../schemas/config";
import { EpisodeSchema } from "../schemas/episode";
import { buildTimeline, durationVerdict, type Timeline } from "../timeline/timeline";
import { findEpisode, paths, readJson, rootDir } from "./paths";

const ENTRY = "src/remotion/index.ts";
const COMPOSITION = "Episode";

export interface PreparedRender {
  props: EpisodeProps;
  propsFile: string;
  outFile: string;
  timeline: Timeline;
}

export function parseFormat(args: string[]): RenderFormat {
  const i = args.indexOf("--format");
  const value = i >= 0 ? args[i + 1] : (args.find((a) => a.startsWith("--format="))?.split("=")[1] ?? "vertical");
  if (value !== "vertical" && value !== "wide") {
    throw new Error(`--format must be "vertical" or "wide", got "${value}"`);
  }
  return value;
}

/** Loads and checks the episode and writes the input props for the composition. */
export function prepareRender(query: string, format: RenderFormat, root = rootDir()): PreparedRender {
  const ref = findEpisode(query, root);
  if (!ref) throw new Error(`episode "${query}" not found under episodes/`);

  const episode = EpisodeSchema.safeParse(readJson(ref.file));
  if (!episode.success) {
    throw new Error(`${relative(root, ref.file)} is not valid; run: pnpm studio validate ${query}`);
  }
  const render = RenderConfigSchema.parse(readJson(join(paths.config(root), "render.json")));

  const props: EpisodeProps = { episode: episode.data, format, render };
  const outDir = join(root, "out");
  mkdirSync(join(outDir, ".props"), { recursive: true });
  const propsFile = join(outDir, ".props", `${episode.data.id}-${format}.json`);
  writeFileSync(propsFile, JSON.stringify(props));

  return {
    props,
    propsFile,
    outFile: join(outDir, `${episode.data.id}-${format}.mp4`),
    timeline: buildTimeline(episode.data, { fps: render.fps, wordsPerSecond: render.wordsPerSecond }),
  };
}

export function timingSummary({ props, timeline }: PreparedRender): string[] {
  const [min, max] = props.episode.targetDurationSec;
  const verdict = durationVerdict(timeline.durationSec, [min, max]);
  const lines = timeline.beats.map((beat) => {
    const sec = (beat.endFrame - beat.startFrame) / timeline.fps;
    const shots = beat.shots.filter((s) => s.shot).length;
    return `  ${beat.id} ${beat.name.padEnd(12)} ${sec.toFixed(1).padStart(5)} s  ${beat.lines.length} line(s), ${shots || "no"} shot(s)`;
  });
  const basis = timeline.estimated
    ? `estimated at ${props.render.wordsPerSecond} words/s and the script's timing`
    : "from the real voice files";
  lines.push(
    `  total ${timeline.durationSec.toFixed(1)} s — ${verdict.toUpperCase()} the ${min}–${max} s target (${basis})`,
  );
  return lines;
}

/** Installed browsers tried, in order, when KRONOS_BROWSER_EXECUTABLE is not set. */
const INSTALLED_BROWSERS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];

/**
 * The browser that draws the frames. An installed Chrome is preferred because the
 * headless build Remotion downloads does not start on every machine; set
 * KRONOS_BROWSER_EXECUTABLE in .env to choose another, or to "remotion" to use
 * Remotion's own download.
 */
export function browserArgs(env: NodeJS.ProcessEnv = process.env): { label: string; args: string[] } {
  const chosen = env.KRONOS_BROWSER_EXECUTABLE?.trim();
  if (chosen === "remotion") return { label: "Remotion's headless browser", args: [] };
  const executable = chosen || INSTALLED_BROWSERS.find((path) => existsSync(path));
  if (!executable) return { label: "Remotion's headless browser", args: [] };
  return {
    label: executable,
    args: [`--browser-executable=${executable}`, "--chrome-mode=chrome-for-testing"],
  };
}

function remotion(args: string[], root: string): number {
  const result = spawnSync("pnpm", ["exec", "remotion", ...args], { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

/** Renders the episode to out/<id>-<format>.mp4. Returns the process exit code. */
export function renderEpisode(prepared: PreparedRender, root = rootDir(), extraArgs: string[] = []): number {
  const browser = browserArgs();
  console.log(`  browser: ${browser.label}`);
  return remotion(
    [
      "render", ENTRY, COMPOSITION, prepared.outFile, `--props=${prepared.propsFile}`,
      // Keep a (silent) audio track until real voices exist, so players and platforms accept the file.
      "--enforce-audio-track",
      ...browser.args, ...extraArgs,
    ],
    root,
  );
}

/** Opens Remotion Studio on the episode. Blocks until the studio is closed. */
export function previewEpisode(prepared: PreparedRender, root = rootDir()): number {
  return remotion(["studio", ENTRY, `--props=${prepared.propsFile}`], root);
}
