import type { Beat, Episode, SfxExtra } from "../schemas/episode";
import type { Character, ChecklistItem, Sound, StructureBeat } from "../schemas/series";
import {
  characterId,
  debrand,
  norm,
  parseOnScreenText,
  parseSfx,
  parseTimeRange,
  parseVoices,
  recurringSoundId,
  slugify,
} from "./parse";
import type { Workbook } from "./xlsx";

/** Target from the bible: over one minute so episodes qualify for payout programs. */
export const TARGET_DURATION_SEC: [number, number] = [62, 70];

/** Script sheet → publish sheet → series id. */
const EPISODE_SHEETS = [
  { scripts: "Guiones", publish: "Publicación", series: "s1" },
  { scripts: "Miniserie - Guiones", publish: "Miniserie - Publicación", series: "miniserie" },
] as const;

/** Sounds the bible lists that the workbook does not. */
const BIBLE_ONLY_SOUNDS: Sound[] = [
  {
    id: "kronos-boot",
    name: "Inicio de Kronos",
    when: "Cuando una computadora se enciende.",
    origin: "bible",
  },
];

export interface ImportedEpisode {
  episode: Episode;
  slug: string;
  /** Rows as written in the sheet, for script.md. */
  scriptRows: Array<{ time: string; visual: string; voices: string; sfx: string; text: string }>;
}

export interface ImportResult {
  characters: Character[];
  sounds: Sound[];
  checklist: ChecklistItem[];
  structure: StructureBeat[] | null;
  episodes: ImportedEpisode[];
  missingSheets: string[];
  warnings: string[];
}

/** Finds a sheet by name, ignoring case, accents and spacing. */
function findSheet(workbook: Workbook, name: string): string[][] | null {
  const wanted = norm(name);
  for (const [sheetName, rows] of Object.entries(workbook)) {
    if (norm(sheetName) === wanted) return rows;
  }
  return null;
}

/** Turns a sheet into records keyed by a column lookup on the header row. */
function table(rows: string[][]) {
  const header = (rows[0] ?? []).map(norm);
  const column = (prefix: string) => header.findIndex((h) => h.startsWith(norm(prefix)));
  return {
    body: rows.slice(1),
    get: (row: string[], prefix: string) => {
      const i = column(prefix);
      return i < 0 ? "" : (row[i] ?? "").trim();
    },
    has: (prefix: string) => column(prefix) >= 0,
  };
}

function unquote(text: string): string {
  return text.replace(/^"(.*)"$/, "$1");
}

function buildCharacters(rows: string[][]): Character[] {
  const t = table(rows);
  return t.body.map((row) => {
    const name = t.get(row, "personaje");
    const voice = t.get(row, "voz");
    const look = t.get(row, "aspecto");
    return {
      id: characterId(name),
      name: name.replace(/\s*\(.*?\)/g, "").trim(),
      role: t.get(row, "rol"),
      look,
      voice,
      catchphrase: t.get(row, "frase"),
      speaks: !norm(voice).startsWith("no habla"),
      appears: !norm(look).startsWith("no aparece"),
    };
  });
}

function buildSounds(rows: string[][], warnings: string[]): Sound[] {
  const t = table(rows);
  const sounds: Sound[] = t.body.map((row) => {
    const name = unquote(t.get(row, "sonido"));
    let id = recurringSoundId(name);
    if (!id) {
      id = slugify(name);
      warnings.push(`Sonidos: "${name}" has no ID in the bible; imported as "${id}"`);
    }
    return { id, name: debrand(name), when: debrand(t.get(row, "cuando")), origin: "sheet" };
  });
  for (const extra of BIBLE_ONLY_SOUNDS) {
    if (!sounds.some((s) => s.id === extra.id)) sounds.push(extra);
  }
  return sounds;
}

function buildChecklist(rows: string[][]): ChecklistItem[] {
  const t = table(rows);
  return t.body.map((row) => ({
    stage: t.get(row, "momento"),
    check: debrand(t.get(row, "punto")),
  }));
}

function buildStructure(rows: string[][]): StructureBeat[] {
  const t = table(rows);
  return t.body.map((row, i) => ({
    number: Number(t.get(row, "#")) || i + 1,
    name: t.get(row, "momento") || t.get(row, "parte") || t.get(row, "bloque"),
    time: t.get(row, "tiempo") || t.get(row, "segundo"),
    what: t.get(row, "que"),
    why: t.get(row, "por que"),
  }));
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function buildEpisodes(
  scriptRows: string[][],
  publishRows: string[][] | null,
  series: string,
  warnings: string[],
): ImportedEpisode[] {
  const scripts = table(scriptRows);
  const publish = publishRows ? table(publishRows) : null;

  const byNumber = new Map<number, string[][]>();
  for (const row of scripts.body) {
    const number = Math.round(Number(scripts.get(row, "ep")));
    if (!Number.isFinite(number) || number < 1) {
      warnings.push(`${series}: skipped a script row with no episode number`);
      continue;
    }
    byNumber.set(number, [...(byNumber.get(number) ?? []), row]);
  }

  const episodes: ImportedEpisode[] = [];
  for (const [number, rows] of [...byNumber].sort((a, b) => a[0] - b[0])) {
    const id = `${series}-${pad2(number)}`;
    const title = scripts.get(rows[0]!, "episodio");
    const pubRow =
      publish?.body.find((row) => Math.round(Number(publish.get(row, "ep"))) === number) ?? null;
    if (publish && !pubRow) warnings.push(`${id}: no row in the publish sheet`);
    const question = pubRow && publish ? publish.get(pubRow, "pregunta en pantalla") : "";

    const extras = new Map<string, SfxExtra>();
    const beats: Beat[] = rows.map((row, i) => {
      const beatId = `b${pad2(i + 1)}`;
      const time = scripts.get(row, "tiempo");
      const range = parseTimeRange(time);
      if (!range) warnings.push(`${id} ${beatId}: could not read the time "${time}"`);

      const voices = parseVoices(scripts.get(row, "voces"));
      for (const w of voices.warnings) warnings.push(`${id} ${beatId}: ${w}`);
      const sfx = parseSfx(scripts.get(row, "sonidos"));
      for (const extra of sfx.extras) extras.set(extra.id, extra);

      const screenText = scripts.get(row, "texto en pantalla");
      const isLast = i === rows.length - 1;
      let name = "desarrollo";
      if (i === 0) name = norm(screenText).startsWith("anteriormente") ? "recap" : "gancho";
      else if (isLast && series === "miniserie") name = "cliffhanger";

      const beat: Beat = {
        id: beatId,
        name,
        visual: scripts.get(row, "visual"),
        lines: voices.lines.map((line, n) => ({
          id: `${beatId}-l${pad2(n + 1)}`,
          speaker: line.speaker,
          text: line.text,
          direction: line.direction,
          audio: null,
          durationSec: null,
        })),
        sfx: sfx.cues,
        onScreenText: parseOnScreenText(screenText, isLast ? question : null),
        shots: [],
      };
      if (range) beat.source = { time, ...range };
      return beat;
    });

    const episode: Episode = {
      id,
      series,
      number,
      title,
      status: "draft",
      targetDurationSec: TARGET_DURATION_SEC,
      tip: null,
      beats,
      publish: {
        coverText: pubRow && publish ? unquote(publish.get(pubRow, "texto de portada")) : "",
        youtubeTitle: pubRow && publish ? publish.get(pubRow, "titulo") : "",
        tiktokDescription: pubRow && publish ? publish.get(pubRow, "descripcion") : "",
        hashtags:
          pubRow && publish ? publish.get(pubRow, "hashtags").split(/\s+/).filter(Boolean) : [],
        pinnedComment: pubRow && publish ? publish.get(pubRow, "comentario fijado") : "",
      },
      costs: { estimated: null, actual: null },
    };
    if (series === "miniserie") {
      episode.cliffhanger = question || null;
      const note = pubRow && publish ? publish.get(pubRow, "final que deja") : "";
      if (note) episode.cliffhangerNote = note;
    }
    if (extras.size > 0) episode.sfxExtra = [...extras.values()];

    episodes.push({
      episode,
      slug: `${pad2(number)}-${slugify(title)}`,
      scriptRows: rows.map((row) => ({
        time: scripts.get(row, "tiempo"),
        visual: scripts.get(row, "visual"),
        voices: scripts.get(row, "voces"),
        sfx: debrand(scripts.get(row, "sonidos")),
        text: scripts.get(row, "texto en pantalla"),
      })),
    });
  }
  return episodes;
}

/** Pure conversion of the showrunner's workbook into series data and episodes. */
export function buildSeries(workbook: Workbook): ImportResult {
  const warnings: string[] = [];
  const missingSheets: string[] = [];
  const need = (name: string) => {
    const rows = findSheet(workbook, name);
    if (!rows) missingSheets.push(name);
    return rows;
  };

  const characterRows = need("Personajes");
  const soundRows = need("Sonidos");
  const structureRows = need("Estructura");
  const checklistRows = findSheet(workbook, "Lista de control");

  const episodes: ImportedEpisode[] = [];
  for (const sheets of EPISODE_SHEETS) {
    const scriptRows = need(sheets.scripts);
    const publishRows = need(sheets.publish);
    if (scriptRows) {
      episodes.push(...buildEpisodes(scriptRows, publishRows, sheets.series, warnings));
    }
  }

  return {
    characters: characterRows ? buildCharacters(characterRows) : [],
    sounds: soundRows ? buildSounds(soundRows, warnings) : [],
    checklist: checklistRows ? buildChecklist(checklistRows) : [],
    structure: structureRows ? buildStructure(structureRows) : null,
    episodes,
    missingSheets,
    warnings,
  };
}
