import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

/** Project root. Overridable so tests can work in a temporary folder. */
export function rootDir(): string {
  return resolve(process.env.KRONOS_ROOT ?? process.cwd());
}

export const paths = {
  source: (root = rootDir()) => join(root, "data/source/kronos-temporada-1.xlsx"),
  series: (root = rootDir()) => join(root, "data/series"),
  config: (root = rootDir()) => join(root, "config"),
  episodes: (root = rootDir()) => join(root, "episodes"),
};

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export interface EpisodeRef {
  /** e.g. "miniserie-01", read from episode.json */
  id: string;
  dir: string;
  file: string;
}

/** Every episodes/<series>/<nn-slug>/episode.json, sorted by path. */
export function listEpisodes(root = rootDir()): EpisodeRef[] {
  const base = paths.episodes(root);
  if (!existsSync(base)) return [];
  const refs: EpisodeRef[] = [];
  for (const series of readdirSync(base).sort()) {
    const seriesDir = join(base, series);
    if (!statSync(seriesDir).isDirectory()) continue;
    for (const folder of readdirSync(seriesDir).sort()) {
      const dir = join(seriesDir, folder);
      const file = join(dir, "episode.json");
      if (!existsSync(file)) continue;
      let id = `${series}-${folder.slice(0, 2)}`;
      try {
        const data = readJson(file) as { id?: unknown };
        if (typeof data.id === "string") id = data.id;
      } catch {
        // Unreadable JSON is reported by validate; keep the folder-derived id.
      }
      refs.push({ id, dir, file });
    }
  }
  return refs;
}

/** Accepts an episode id ("miniserie-01") or a folder path. */
export function findEpisode(query: string, root = rootDir()): EpisodeRef | null {
  const all = listEpisodes(root);
  const byId = all.find((e) => e.id === query);
  if (byId) return byId;
  const asPath = resolve(root, query);
  return all.find((e) => e.dir === asPath) ?? null;
}
