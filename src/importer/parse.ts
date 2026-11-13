import type { OnScreenText, SfxCue, SfxExtra } from "../schemas/episode";

/** Lower-case, no accents, single spaces. For matching only, never for output. */
export function norm(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** "Lunes, 8:59" → "lunes-859" */
export function slugify(text: string): string {
  return norm(text)
    .replace(/[^a-z0-9 -]/g, "")
    .trim()
    .replace(/[ -]+/g, "-");
}

/** "Kronos 2.0 (la IA)" → "kronos", "El Hacker / El Estafador" → "hacker" */
export function characterId(name: string): string {
  const base = norm((name.replace(/\(.*?\)/g, "").split("/")[0] ?? "").trim())
    .replace(/^(el|la|los|las) /, "")
    .replace(/ \d+(\.\d+)?$/, "");
  return slugify(base);
}

/**
 * The scripts name real operating-system sounds. The series uses its own
 * jingles instead (bible, "Recurring sounds"), so the names are replaced on import.
 */
export function debrand(text: string): string {
  return text.replace(/\b(error|apagado|inicio) de Windows\b/gi, "$1 de Kronos");
}

/** "0:27–0:36" → { startSec: 27, endSec: 36 } */
export function parseTimeRange(text: string): { startSec: number; endSec: number } | null {
  const m = text.match(/(\d+):(\d{2})\s*[–—-]\s*(\d+):(\d{2})/);
  if (!m) return null;
  return {
    startSec: Number(m[1]) * 60 + Number(m[2]),
    endSec: Number(m[3]) * 60 + Number(m[4]),
  };
}

// ---------------------------------------------------------------- voices

export interface ParsedLine {
  speaker: string;
  text: string;
  direction: string | null;
}

/** Speakers in the scripts that are a known character under another label. */
const SPEAKER_ALIASES: Record<string, { id: string; direction: string }> = {
  "todos-los-aparatos": { id: "kronos", direction: "todos los aparatos a la vez" },
};

// Either `Speaker (qualifier): "text"` or a continuation `(pausa) "text"` / `"text"`
// that belongs to the previous speaker.
const LINE_RE =
  /(?:([A-Za-zÁÉÍÓÚÑáéíóúñ][^:"()]*?)\s*(?:\(([^)]*)\))?\s*:\s*|\(([^)]*)\)\s*)?"([^"]*)"/g;

/** Splits a "Voces" cell into one entry per spoken line. */
export function parseVoices(cell: string): { lines: ParsedLine[]; warnings: string[] } {
  const text = cell.replace(/[“”]/g, '"');
  const lines: ParsedLine[] = [];
  const warnings: string[] = [];
  let previous: string | null = null;

  for (const m of text.matchAll(LINE_RE)) {
    const [, name, qualifier, aside, spoken] = m;
    let speaker: string;
    let direction: string | null = qualifier?.trim() || aside?.trim() || null;
    if (name) {
      const id = characterId(name);
      const alias = SPEAKER_ALIASES[id];
      if (alias) {
        speaker = alias.id;
        direction = direction ? `${alias.direction}, ${direction}` : alias.direction;
        warnings.push(`speaker "${name.trim()}" mapped to "${alias.id}"`);
      } else {
        speaker = id;
      }
    } else if (previous) {
      speaker = previous;
    } else {
      warnings.push(`line without a speaker: "${spoken}"`);
      continue;
    }
    previous = speaker;
    if (spoken && spoken.trim()) lines.push({ speaker, text: spoken.trim(), direction });
  }

  const leftover = text.replace(LINE_RE, "").trim();
  if (leftover) warnings.push(`unparsed text in voices: "${leftover}"`);
  return { lines, warnings };
}

// ---------------------------------------------------------------- sounds

/** Script wording → recurring sound ID from the bible. First match wins. */
const RECURRING_SOUNDS: Array<[RegExp, string]> = [
  [/\bteclado\b/, "teclado"],
  [/\bmodems?\b/, "modem"],
  [/\berror de (windows|kronos)\b/, "kronos-error"],
  [/^apagado\b/, "kronos-shutdown"],
  [/\binicio de (windows|kronos)\b/, "kronos-boot"],
  [/\bplastilina\b/, "clay-squash"],
  [/^"?ding"?$/, "ding"],
  [/\bwhoosh\b/, "whoosh"],
  [/\bgrillo\b/, "grillo"],
  [/\btic-?tac\b/, "tictac"],
  [/\blata que se abre\b/, "lata"],
  [/\bcoro celestial\b/, "coro"],
  [/\bsello\b/, "sello"],
];

export function recurringSoundId(description: string): string | null {
  const n = norm(description);
  for (const [pattern, id] of RECURRING_SOUNDS) if (pattern.test(n)) return id;
  return null;
}

/** Wording that is exactly the plain recurring sound, so no variation note is needed. */
const PLAIN_NAMES = new Set([
  "teclado mecanico",
  "modem",
  "modem de los 90",
  "grillo",
  "tic-tac",
  "lata que se abre",
]);

/** Splits an "SFX" cell into cues, and lists the non-recurring sounds it needs. */
export function parseSfx(cell: string): { cues: SfxCue[]; extras: SfxExtra[] } {
  const cues: SfxCue[] = [];
  const extras: SfxExtra[] = [];
  for (const raw of cell.split(",")) {
    const item = raw.trim().replace(/\.$/, "");
    if (!item) continue;
    const recurring = recurringSoundId(item);
    if (recurring) {
      const cue: SfxCue = { id: recurring, at: recurring === "kronos-shutdown" ? "end" : "start" };
      if (!PLAIN_NAMES.has(norm(item))) cue.note = debrand(item);
      cues.push(cue);
    } else {
      const id = slugify(item).slice(0, 48).replace(/-$/, "");
      cues.push({ id, at: "start" });
      extras.push({ id, description: item });
    }
  }
  return { cues, extras };
}

// ---------------------------------------------------------------- on-screen text

const CONTINUARA = "Continuará...";

/**
 * Splits a "Texto en pantalla" cell into styled entries. `question` is the
 * cliffhanger question from the publish sheet, when known.
 */
export function parseOnScreenText(cell: string, question?: string | null): OnScreenText[] {
  let rest = cell.trim();
  if (!rest) return [];
  const out: OnScreenText[] = [];

  const recap = rest.match(/^(Anteriormente\.\.\.)\s*\((Parte \d+ de \d+)\)$/);
  if (recap) {
    return [
      { text: recap[1]!, style: "recap" },
      { text: recap[2]!, style: "tag" },
    ];
  }
  if (/^(Parte \d+ de \d+|Ep\. ?\d+.*)$/.test(rest)) return [{ text: rest, style: "tag" }];

  const tail: OnScreenText[] = [];
  if (rest.endsWith(CONTINUARA)) {
    tail.unshift({ text: CONTINUARA, style: "continuara" });
    rest = rest.slice(0, -CONTINUARA.length).trim();
  }
  const q = question?.replace(CONTINUARA, "").trim();
  if (q && rest.endsWith(q)) {
    tail.unshift({ text: q, style: /^¿.*\?$/.test(q) ? "question" : "screen" });
    rest = rest.slice(0, -q.length).trim();
  } else {
    const m = rest.match(/^(.*?)(¿[^¿?]*\?)$/s);
    if (m && tail.length > 0) {
      tail.unshift({ text: m[2]!, style: "question" });
      rest = m[1]!.trim();
    }
  }
  if (rest) out.push({ text: rest, style: "screen" });
  return [...out, ...tail];
}

// ---------------------------------------------------------------- estimates

export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}
