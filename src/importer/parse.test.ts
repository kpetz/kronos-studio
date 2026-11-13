import { describe, expect, it } from "vitest";
import {
  characterId,
  countWords,
  debrand,
  parseOnScreenText,
  parseSfx,
  parseTimeRange,
  parseVoices,
  slugify,
} from "./parse";

describe("slugify and characterId", () => {
  it("builds folder slugs", () => {
    expect(slugify("Lunes, 8:59")).toBe("lunes-859");
    expect(slugify("Lo advertí")).toBe("lo-adverti");
  });

  it("maps sheet names to the bible's character ids", () => {
    expect(characterId("Kronos 2.0 (la IA)")).toBe("kronos");
    expect(characterId("El Junior")).toBe("junior");
    expect(characterId("Casandra (QA)")).toBe("casandra");
    expect(characterId("La Impresora")).toBe("impresora");
    expect(characterId("El Hacker / El Estafador")).toBe("hacker");
    expect(characterId("Narrador")).toBe("narrador");
  });
});

describe("parseTimeRange", () => {
  it("reads an en-dash range", () => {
    expect(parseTimeRange("0:46–0:55")).toEqual({ startSec: 46, endSec: 55 });
    expect(parseTimeRange("1:02-1:10")).toEqual({ startSec: 62, endSec: 70 });
    expect(parseTimeRange("pronto")).toBeNull();
  });
});

describe("parseVoices", () => {
  it("splits lines by speaker", () => {
    const { lines, warnings } = parseVoices(
      'Junior: "¿Kronos?" Jefe: "¡Enciéndelo! ¡Tengo que responder un correo!"',
    );
    expect(warnings).toEqual([]);
    expect(lines).toEqual([
      { speaker: "junior", text: "¿Kronos?", direction: null },
      { speaker: "jefe", text: "¡Enciéndelo! ¡Tengo que responder un correo!", direction: null },
    ]);
  });

  it("keeps a qualifier as the direction", () => {
    const { lines } = parseVoices('Kronos (recuerdo, con eco): "Regla tres, dos, uno."');
    expect(lines).toEqual([
      { speaker: "kronos", text: "Regla tres, dos, uno.", direction: "recuerdo, con eco" },
    ]);
  });

  it("gives a continuation after an aside to the previous speaker", () => {
    const { lines, warnings } = parseVoices(
      'Narrador: "Ticket cerrado." Kronos: "Ticket abierto." (pausa) "¿Y tú?"',
    );
    expect(warnings).toEqual([]);
    expect(lines.map((l) => [l.speaker, l.text, l.direction])).toEqual([
      ["narrador", "Ticket cerrado.", null],
      ["kronos", "Ticket abierto.", null],
      ["kronos", "¿Y tú?", "pausa"],
    ]);
  });

  it("keeps single quotes inside a line", () => {
    const { lines } = parseVoices("Jefe: \"¡No sé ni escribir 'Estimados'!\"");
    expect(lines[0]?.text).toBe("¡No sé ni escribir 'Estimados'!");
  });

  it("maps the devices' chorus to Kronos and says so", () => {
    const { lines, warnings } = parseVoices('Todos los aparatos: "Claro, con gusto."');
    expect(lines[0]).toMatchObject({ speaker: "kronos", direction: "todos los aparatos a la vez" });
    expect(warnings).toHaveLength(1);
  });

  it("reports text it cannot place", () => {
    expect(parseVoices('Junior: "Hola." y luego se va').warnings[0]).toContain("unparsed");
    expect(parseVoices('"Sin dueño."').warnings[0]).toContain("without a speaker");
  });
});

describe("parseSfx", () => {
  it("maps recurring sounds to their ids and lists the rest as extras", () => {
    const { cues, extras } = parseSfx("Teclado mecánico, taza rompiéndose");
    expect(cues).toEqual([
      { id: "teclado", at: "start" },
      { id: "taza-rompiendose", at: "start" },
    ]);
    expect(extras).toEqual([{ id: "taza-rompiendose", description: "taza rompiéndose" }]);
  });

  it("replaces the operating-system sounds with the series' own", () => {
    const { cues, extras } = parseSfx("Golpe de tambor, apagado de Windows cortado a la mitad");
    expect(cues[1]).toEqual({
      id: "kronos-shutdown",
      at: "end",
      note: "apagado de Kronos cortado a la mitad",
    });
    expect(extras.map((e) => e.id)).toEqual(["golpe-de-tambor"]);
    expect(parseSfx("Error de Windows con eco").cues[0]).toMatchObject({ id: "kronos-error" });
    expect(parseSfx("apagado cortado").cues[0]).toMatchObject({ id: "kronos-shutdown" });
  });

  it("does not mistake similar wording for a recurring sound", () => {
    const ids = parseSfx("latas cayendo, lata rodando, luces apagándose, Reloj").cues.map((c) => c.id);
    expect(ids).toEqual(["latas-cayendo", "lata-rodando", "luces-apagandose", "reloj"]);
  });

  it("keeps a variation as a note", () => {
    expect(parseSfx("Módem distorsionado").cues[0]).toEqual({
      id: "modem",
      at: "start",
      note: "Módem distorsionado",
    });
    expect(parseSfx("Lata que se abre").cues[0]).toEqual({ id: "lata", at: "start" });
  });
});

describe("parseOnScreenText", () => {
  it("styles the part tag and the recap", () => {
    expect(parseOnScreenText("Parte 1 de 6")).toEqual([{ text: "Parte 1 de 6", style: "tag" }]);
    expect(parseOnScreenText("Anteriormente... (Parte 2 de 6)")).toEqual([
      { text: "Anteriormente...", style: "recap" },
      { text: "Parte 2 de 6", style: "tag" },
    ]);
  });

  it("splits the cliffhanger question from the card", () => {
    expect(parseOnScreenText("¿Fue el Junior? Continuará...", "¿Fue el Junior?")).toEqual([
      { text: "¿Fue el Junior?", style: "question" },
      { text: "Continuará...", style: "continuara" },
    ]);
  });

  it("keeps prop text ahead of the question", () => {
    expect(
      parseOnScreenText(
        "Copia de seguridad: 100 %. Destino: ... ¿Dónde está la copia? Continuará...",
        "¿Dónde está la copia?",
      ),
    ).toEqual([
      { text: "Copia de seguridad: 100 %. Destino: ...", style: "screen" },
      { text: "¿Dónde está la copia?", style: "question" },
      { text: "Continuará...", style: "continuara" },
    ]);
  });

  it("treats everything else as text on a prop", () => {
    expect(parseOnScreenText("Cámara 1, 23:40")).toEqual([{ text: "Cámara 1, 23:40", style: "screen" }]);
    expect(parseOnScreenText("")).toEqual([]);
  });
});

describe("debrand and countWords", () => {
  it("renames only the sound names", () => {
    expect(debrand("el apagado de Windows.")).toBe("el apagado de Kronos.");
    expect(debrand("Reinstala Windows.")).toBe("Reinstala Windows.");
  });

  it("counts spoken words, not punctuation", () => {
    expect(countWords("Lunes, 8:59. Kronos no respondió.")).toBe(5);
    expect(countWords("¿Y tú? — ...")).toBe(2);
  });
});
