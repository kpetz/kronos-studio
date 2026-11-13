import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { EpisodeSchema } from "../schemas/episode";
import { CharactersFileSchema, SoundsFileSchema } from "../schemas/series";
import { buildSeries } from "./build";
import { writeImport } from "./write";
import { readXlsx, type Workbook } from "./xlsx";

const workbook: Workbook = {
  Personajes: [
    ["Personaje", "Rol en la oficina", "Aspecto", "Voz", "Frase recurrente"],
    ["Narrador", "Cuenta el problema.", "No aparece.", "Grave.", '"Ticket cerrado."'],
    ["Kronos 2.0 (la IA)", "La IA.", "Monitor beige.", "Sintética.", '"Claro, con gusto."'],
    ["El Junior", "Obedece.", "Ojeras.", "Aguda.", '"Ya quedó, creo."'],
    ["La Impresora", "La villana.", "Impresora beige.", "No habla: gruñe.", "(gruñido)"],
  ],
  Sonidos: [
    ["Sonido", "Cuándo se usa"],
    ["Teclado mecánico", "Cada vez que el Junior escribe."],
    ['"Ding"', "Cuando algo funciona."],
    ["Apagado de Windows", 'Cierre, después de "Ticket cerrado".'],
  ],
  "Lista de control": [
    ["Momento", "Punto a revisar"],
    ["Edición", 'El video termina con "Ticket cerrado" y el apagado de Windows.'],
  ],
  "Miniserie - Guiones": [
    ["Ep.", "Episodio", "Tiempo", "Visual (claymation)", "Voces (narrador y personajes)", "Sonidos (SFX)", "Texto en pantalla"],
    ["1.0", "Lunes, 8:59", "0:00–0:03", "Oficina a oscuras.", 'Narrador: "Kronos no respondió."', "Zumbido", "Parte 1 de 6"],
    ["1.0", "Lunes, 8:59", "0:03–0:55", "Primer plano.", 'Junior: "Puedo explicarlo." Narrador: "O eso dijo."', "Teclado mecánico, apagado de Windows cortado", "¿Fue el Junior? Continuará..."],
    ["2.0", "El sospechoso obvio", "0:00–0:04", "Repetición.", 'Narrador: "Anteriormente."', "", "Anteriormente... (Parte 2 de 6)"],
  ],
  "Miniserie - Publicación": [
    ["Ep.", "Episodio", "Final que deja la duda", "Pregunta en pantalla", "Texto de portada", "Título (YouTube Shorts)", "Descripción (TikTok)", "Hashtags", "Comentario fijado"],
    ["1.0", "Lunes, 8:59", "Aparecen unas tijeras.", "¿Fue el Junior?", '"Alguien desenchufó a la IA" (Parte 1)', "Alguien desenchufó a la IA | Parte 1", "Lunes, 8:59.", "#miniserie #kronos2", "¿Quién fue?"],
  ],
};

describe("buildSeries", () => {
  const result = buildSeries(workbook);

  it("imports the cast with ids and flags", () => {
    expect(CharactersFileSchema.safeParse(result.characters).success).toBe(true);
    expect(result.characters.map((c) => c.id)).toEqual(["narrador", "kronos", "junior", "impresora"]);
    expect(result.characters.find((c) => c.id === "narrador")).toMatchObject({ appears: false, speaks: true });
    expect(result.characters.find((c) => c.id === "impresora")).toMatchObject({ appears: true, speaks: false });
    expect(result.characters.find((c) => c.id === "kronos")?.name).toBe("Kronos 2.0");
  });

  it("renames the operating-system sounds and adds the bible-only one", () => {
    expect(SoundsFileSchema.safeParse(result.sounds).success).toBe(true);
    expect(result.sounds.map((s) => s.id)).toEqual(["teclado", "ding", "kronos-shutdown", "kronos-boot"]);
    expect(result.sounds.find((s) => s.id === "kronos-shutdown")?.name).toBe("Apagado de Kronos");
    expect(JSON.stringify([result.sounds, result.checklist])).not.toMatch(/Windows/);
  });

  it("builds one valid episode per number", () => {
    expect(result.episodes.map((e) => e.slug)).toEqual(["01-lunes-859", "02-el-sospechoso-obvio"]);
    for (const { episode } of result.episodes) {
      expect(EpisodeSchema.safeParse(episode).success).toBe(true);
      expect(episode.status).toBe("draft");
    }
  });

  it("fills beats, lines, sounds and publish data", () => {
    const ep = result.episodes[0]!.episode;
    expect(ep.id).toBe("miniserie-01");
    expect(ep.beats.map((b) => b.name)).toEqual(["gancho", "cliffhanger"]);
    expect(ep.beats[1]!.lines.map((l) => [l.id, l.speaker])).toEqual([
      ["b02-l01", "junior"],
      ["b02-l02", "narrador"],
    ]);
    expect(ep.beats[1]!.sfx.map((s) => s.id)).toEqual(["teclado", "kronos-shutdown"]);
    expect(ep.sfxExtra).toEqual([{ id: "zumbido", description: "Zumbido" }]);
    expect(ep.beats[1]!.source).toEqual({ time: "0:03–0:55", startSec: 3, endSec: 55 });
    expect(ep.cliffhanger).toBe("¿Fue el Junior?");
    expect(ep.publish.coverText).toBe('"Alguien desenchufó a la IA" (Parte 1)');
    expect(ep.publish.hashtags).toEqual(["#miniserie", "#kronos2"]);
    expect(result.episodes[1]!.episode.beats[0]!.name).toBe("recap");
  });

  it("reports what the workbook lacks", () => {
    expect(result.missingSheets).toEqual(["Estructura", "Guiones", "Publicación"]);
    expect(result.warnings).toContain("miniserie-02: no row in the publish sheet");
  });
});

describe("writeImport", () => {
  it("writes the files and never overwrites an existing episode without --force", () => {
    const root = mkdtempSync(join(tmpdir(), "kronos-import-"));
    const result = buildSeries(workbook);

    const first = writeImport(result, { root });
    expect(first.written).toHaveLength(2);
    const file = join(root, "episodes/miniserie/01-lunes-859/episode.json");
    expect(existsSync(join(root, "data/series/characters.json"))).toBe(true);
    expect(existsSync(join(root, "data/series/structure.json"))).toBe(false);
    expect(readFileSync(join(root, "episodes/miniserie/01-lunes-859/script.md"), "utf8")).toContain(
      "| 0:00–0:03 | Oficina a oscuras. |",
    );

    writeFileSync(file, '{"edited":true}\n');
    const second = writeImport(result, { root });
    expect(second.written).toEqual([]);
    expect(second.skipped).toHaveLength(2);
    expect(readFileSync(file, "utf8")).toBe('{"edited":true}\n');

    const forced = writeImport(result, { root, force: true });
    expect(forced.written).toHaveLength(2);
    expect(JSON.parse(readFileSync(file, "utf8")).id).toBe("miniserie-01");
  });
});

const realSource = join(process.cwd(), "data/source/kronos-temporada-1.xlsx");

describe.skipIf(!existsSync(realSource))("the showrunner's workbook", () => {
  const result = buildSeries(readXlsx(realSource));

  it("imports the six miniseries parts as valid episodes", () => {
    const mini = result.episodes.filter((e) => e.episode.series === "miniserie");
    expect(mini).toHaveLength(6);
    for (const { episode } of mini) {
      expect(EpisodeSchema.safeParse(episode).success).toBe(true);
      expect(episode.beats.length).toBeGreaterThanOrEqual(7);
      expect(episode.publish.youtubeTitle).not.toBe("");
    }
  });

  it("only uses speakers from the cast", () => {
    const cast = new Set(result.characters.filter((c) => c.speaks).map((c) => c.id));
    const speakers = result.episodes.flatMap((e) => e.episode.beats.flatMap((b) => b.lines.map((l) => l.speaker)));
    expect(speakers.filter((s) => !cast.has(s))).toEqual([]);
  });

  it("leaves no dialogue unparsed", () => {
    expect(result.warnings.filter((w) => /unparsed|without a speaker|could not read/.test(w))).toEqual([]);
  });
});
