import type { RenderConfig } from "../schemas/config";
import type { Episode } from "../schemas/episode";

export type RenderFormat = "vertical" | "wide";

/** Input of the "Episode" composition. Written by `pnpm studio render`. */
export type EpisodeProps = {
  episode: Episode;
  format: RenderFormat;
  render: RenderConfig;
};

const line = (id: string, speaker: string, text: string) => ({
  id, speaker, text, direction: null, audio: null, durationSec: null,
});

/**
 * Stand-in data so the composition opens in Remotion Studio without an episode.
 * Not canon and never rendered for publishing; it only exercises every overlay.
 */
export const sampleProps: EpisodeProps = {
  format: "vertical",
  render: {
    fps: 24,
    formats: { vertical: { width: 1080, height: 1920 }, wide: { width: 1920, height: 1080 } },
    captionSafeZone: { top: 0.6, bottom: 0.78 },
    audio: { loudnessLufs: -14, truePeakDb: -1, musicUnderVoiceDb: -18 },
    wordsPerSecond: 2.6,
  },
  episode: {
    id: "muestra-01",
    series: "muestra",
    number: 1,
    title: "Composición de muestra",
    status: "draft",
    targetDurationSec: [62, 70],
    tip: { text: "Texto del consejo de muestra.", steps: ["Primer paso de muestra.", "Segundo paso de muestra."], source: null },
    cliffhanger: null,
    beats: [
      {
        id: "b01", name: "gancho", visual: "Descripción visual de muestra para el primer plano.",
        lines: [line("b01-l01", "narrador", "Esta es una línea de muestra del narrador.")],
        sfx: [{ id: "teclado", at: "start" }],
        onScreenText: [{ text: "Ep. 1", style: "tag" }],
        shots: [],
      },
      {
        id: "b02", name: "desarrollo", visual: "Descripción visual de muestra con texto en un monitor.",
        lines: [
          line("b02-l01", "junior", "Línea de muestra del Junior."),
          line("b02-l02", "kronos", "Línea de muestra de Kronos, un poco más larga que la anterior."),
        ],
        sfx: [{ id: "modem", at: "start" }],
        onScreenText: [{ text: "Texto de muestra en pantalla.", style: "screen" }],
        shots: [],
      },
      {
        id: "b03", name: "dato-real", visual: "Descripción visual de muestra para el sello.",
        lines: [line("b03-l01", "narrador", "Línea de muestra para el cierre del episodio.")],
        sfx: [{ id: "sello", at: "start" }],
        onScreenText: [{ text: "DATO REAL", style: "stamp" }],
        shots: [],
      },
      {
        id: "b04", name: "cliffhanger", visual: "Descripción visual de muestra para el final.",
        lines: [line("b04-l01", "casandra", "Línea de muestra de Casandra.")],
        sfx: [],
        onScreenText: [
          { text: "¿Pregunta de muestra?", style: "question" },
          { text: "Continuará...", style: "continuara" },
        ],
        shots: [],
      },
    ],
    publish: { coverText: "", youtubeTitle: "", tiktokDescription: "", hashtags: [], pinnedComment: "" },
    costs: { estimated: null, actual: null },
  },
};
