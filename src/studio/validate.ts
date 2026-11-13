import { existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { ZodType } from "zod";
import { countWords, norm } from "../importer/parse";
import {
  ProvidersConfigSchema,
  RenderConfigSchema,
  VoicesConfigSchema,
  type ProvidersConfig,
  type RenderConfig,
} from "../schemas/config";
import { EpisodeSchema, type Episode } from "../schemas/episode";
import {
  CharactersFileSchema,
  ChecklistFileSchema,
  SoundsFileSchema,
  StructureFileSchema,
  type Character,
  type Sound,
} from "../schemas/series";
import { findEpisode, listEpisodes, paths, readJson, rootDir, type EpisodeRef } from "./paths";

/** Real brand names that must not reach the screen or the dialogue (hard rule 7). */
const BRAND_TERMS = ["windows"];
/** Scriptwriter rule: a line of dialogue is at most this many words. */
const MAX_WORDS_PER_LINE = 14;

export interface Findings {
  errors: string[];
  warnings: string[];
}

export interface EpisodeReport extends Findings {
  id: string;
  dir: string;
  /** Present when the file passed the schema. */
  stats?: { words: number; speechSec: number; sourceSec: number | null; lines: number };
}

export interface ValidationReport {
  project: Findings;
  episodes: EpisodeReport[];
  ok: boolean;
}

interface Canon {
  characters: Map<string, Character>;
  sounds: Map<string, Sound>;
  providers: ProvidersConfig | null;
  render: RenderConfig | null;
}

function loadFile<T>(
  file: string,
  schema: ZodType<T>,
  findings: Findings,
  required: boolean,
): T | null {
  if (!existsSync(file)) {
    if (required) findings.errors.push(`${file}: missing`);
    return null;
  }
  let data: unknown;
  try {
    data = readJson(file);
  } catch (e) {
    findings.errors.push(`${file}: not valid JSON (${(e as Error).message})`);
    return null;
  }
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      findings.errors.push(`${file}: ${issue.path.join(".") || "(root)"} — ${issue.message}`);
    }
    return null;
  }
  return parsed.data;
}

function loadCanon(root: string, findings: Findings): Canon {
  const series = paths.series(root);
  const config = paths.config(root);
  const characters = loadFile(join(series, "characters.json"), CharactersFileSchema, findings, true);
  const sounds = loadFile(join(series, "sounds.json"), SoundsFileSchema, findings, true);
  loadFile(join(series, "checklist.json"), ChecklistFileSchema, findings, false);
  loadFile(join(series, "structure.json"), StructureFileSchema, findings, false);
  const voices = loadFile(join(config, "voices.json"), VoicesConfigSchema, findings, true);
  const providers = loadFile(join(config, "providers.json"), ProvidersConfigSchema, findings, true);
  const render = loadFile(join(config, "render.json"), RenderConfigSchema, findings, true);

  const characterMap = new Map((characters ?? []).map((c) => [c.id, c]));
  if (voices) {
    for (const id of Object.keys(voices.voices)) {
      if (!characterMap.has(id)) findings.errors.push(`config/voices.json: unknown character "${id}"`);
    }
    for (const c of characterMap.values()) {
      if (c.speaks && !voices.voices[c.id]) {
        findings.errors.push(`config/voices.json: no voice entry for "${c.id}"`);
      }
    }
  }
  return {
    characters: characterMap,
    sounds: new Map((sounds ?? []).map((s) => [s.id, s])),
    providers,
    render,
  };
}

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const id of ids) (seen.has(id) ? dup : seen).add(id);
  return [...dup];
}

export function checkEpisode(episode: Episode, canon: Canon, dir?: string): EpisodeReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const pad = String(episode.number).padStart(2, "0");

  if (episode.id !== `${episode.series}-${pad}`) {
    errors.push(`id "${episode.id}" does not match series "${episode.series}" and number ${episode.number}`);
  }
  if (dir) {
    if (basename(dirname(dir)) !== episode.series) {
      errors.push(`folder is under "${basename(dirname(dir))}" but series is "${episode.series}"`);
    }
    if (!basename(dir).startsWith(`${pad}-`)) {
      errors.push(`folder "${basename(dir)}" does not start with "${pad}-"`);
    }
  }
  if (episode.targetDurationSec[0] > episode.targetDurationSec[1]) {
    errors.push("targetDurationSec: minimum is above maximum");
  }

  const lines = episode.beats.flatMap((b) => b.lines);
  const shots = episode.beats.flatMap((b) => b.shots);
  for (const id of duplicates(episode.beats.map((b) => b.id))) errors.push(`duplicate beat id "${id}"`);
  for (const id of duplicates(lines.map((l) => l.id))) errors.push(`duplicate line id "${id}"`);
  for (const id of duplicates(shots.map((s) => s.id))) errors.push(`duplicate shot id "${id}"`);

  const anchors = new Set([...lines.map((l) => l.id), ...shots.map((s) => s.id)]);
  const extraIds = new Set((episode.sfxExtra ?? []).map((e) => e.id));

  const brandCheck = (where: string, text: string) => {
    const n = norm(text);
    for (const term of BRAND_TERMS) {
      if (new RegExp(`\\b${term}\\b`).test(n)) {
        warnings.push(`${where}: real brand name "${term}" in "${text}"`);
      }
    }
  };

  for (const beat of episode.beats) {
    for (const line of beat.lines) {
      const who = canon.characters.get(line.speaker);
      if (!who) errors.push(`${line.id}: speaker "${line.speaker}" is not in characters.json`);
      else if (!who.speaks) errors.push(`${line.id}: "${line.speaker}" never speaks; use a sound cue`);
      const words = countWords(line.text);
      if (words > MAX_WORDS_PER_LINE) {
        warnings.push(`${line.id}: ${words} words, over the ${MAX_WORDS_PER_LINE}-word limit per line`);
      }
      brandCheck(line.id, line.text);
    }
    for (const cue of beat.sfx) {
      if (!canon.sounds.has(cue.id) && !extraIds.has(cue.id)) {
        errors.push(`${beat.id}: sound "${cue.id}" is not in sounds.json or sfxExtra`);
      }
      if (typeof cue.at === "object" && !anchors.has(cue.at.ref)) {
        errors.push(`${beat.id}: sound "${cue.id}" is anchored to unknown id "${cue.at.ref}"`);
      }
      if (cue.note) brandCheck(`${beat.id} sfx`, cue.note);
    }
    for (const text of beat.onScreenText) brandCheck(`${beat.id} on-screen text`, text.text);
    for (const shot of beat.shots) {
      for (const id of shot.characters) {
        const who = canon.characters.get(id);
        if (!who) errors.push(`${shot.id}: character "${id}" is not in characters.json`);
        else if (!who.appears) errors.push(`${shot.id}: "${id}" never appears on screen`);
      }
      if (shot.type === "B" && canon.providers && shot.durationSec > canon.providers.video.maxClipSec) {
        errors.push(`${shot.id}: clip is ${shot.durationSec} s, over the ${canon.providers.video.maxClipSec} s limit`);
      }
    }
  }

  const clips = shots.filter((s) => s.type === "B").length;
  if (canon.providers && clips > canon.providers.video.maxClipsPerEpisode) {
    errors.push(`${clips} type B shots, over the limit of ${canon.providers.video.maxClipsPerEpisode}`);
  }
  if (episode.series === "miniserie" && !episode.cliffhanger) {
    warnings.push("miniseries part has no cliffhanger question");
  }

  const words = lines.reduce((sum, l) => sum + countWords(l.text), 0);
  const speechSec = words / (canon.render?.wordsPerSecond ?? 2.6);
  const lastSource = episode.beats.at(-1)?.source;
  const sourceSec = lastSource ? lastSource.endSec : null;
  const [min, max] = episode.targetDurationSec;
  const measured = lines.every((l) => l.durationSec != null);
  if (!measured && sourceSec != null && (sourceSec < min || sourceSec > max)) {
    warnings.push(`script timing is ${sourceSec} s, outside the ${min}–${max} s target`);
  }
  if (speechSec > max) {
    warnings.push(`speech alone is about ${speechSec.toFixed(0)} s, over the ${max} s maximum`);
  }

  return {
    id: episode.id,
    dir: dir ?? "",
    errors,
    warnings,
    stats: { words, speechSec, sourceSec, lines: lines.length },
  };
}

function validateEpisodeFile(ref: EpisodeRef, canon: Canon): EpisodeReport {
  const findings: Findings = { errors: [], warnings: [] };
  const episode = loadFile(ref.file, EpisodeSchema, findings, true);
  if (!episode) return { id: ref.id, dir: ref.dir, ...findings };
  return checkEpisode(episode, canon, ref.dir);
}

/** Schema and canon checks for one episode (by id or folder) or for all of them. */
export function validateProject(query?: string, root = rootDir()): ValidationReport {
  const project: Findings = { errors: [], warnings: [] };
  const canon = loadCanon(root, project);

  let refs: EpisodeRef[];
  if (query) {
    const ref = findEpisode(query, root);
    if (!ref) project.errors.push(`episode "${query}" not found under episodes/`);
    refs = ref ? [ref] : [];
  } else {
    refs = listEpisodes(root);
    if (refs.length === 0) project.warnings.push("no episodes found under episodes/");
  }

  const episodes = refs.map((ref) => validateEpisodeFile(ref, canon));
  const ok = project.errors.length === 0 && episodes.every((e) => e.errors.length === 0);
  return { project, episodes, ok };
}
