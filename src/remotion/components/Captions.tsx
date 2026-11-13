import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { Timeline } from "../../timeline/timeline";
import { fonts, outline, palette, speakerColors } from "../theme";

/** Caption band for the wide format, where the style guide gives no safe zone. */
const WIDE_ZONE = { top: 0.74, bottom: 0.94 };

/**
 * Captions for all speech: a few words at a time inside the safe zone, the
 * word being spoken in mustard, the speaker's name in their colour. Crisp, no jitter.
 */
export const Captions: FC<{
  timeline: Timeline;
  safeZone: { top: number; bottom: number };
  speakerNames: Record<string, string>;
}> = ({ timeline, safeZone, speakerNames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const vertical = height > width;
  const unit = Math.min(width, height) / 1080;
  const zone = vertical ? safeZone : WIDE_ZONE;

  for (const beat of timeline.beats) {
    if (frame < beat.startFrame || frame >= beat.endFrame) continue;
    for (const line of beat.lines) {
      const chunk = line.chunks.find((c) => frame >= c.startFrame && frame < c.endFrame);
      if (!chunk) continue;
      return (
        <AbsoluteFill>
          <div
            style={{
              position: "absolute",
              top: `${zone.top * 100}%`,
              height: `${(zone.bottom - zone.top) * 100}%`,
              left: "8%",
              right: vertical ? "13%" : "8%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: fonts.heavy,
                fontSize: 30 * unit,
                letterSpacing: 2 * unit,
                textTransform: "uppercase",
                color: speakerColors[line.speaker] ?? palette.white,
                marginBottom: 8 * unit,
                ...outline(8 * unit),
              }}
            >
              {speakerNames[line.speaker] ?? line.speaker}
            </div>
            <div
              style={{
                fontFamily: fonts.heavy,
                fontSize: (vertical ? 72 : 60) * unit,
                lineHeight: 1.12,
                ...outline(14 * unit),
              }}
            >
              {chunk.words.map((word, i) => (
                <span
                  key={i}
                  style={{
                    color: frame >= word.startFrame && frame < word.endFrame ? palette.mustard : palette.white,
                  }}
                >
                  {word.text}
                  {i < chunk.words.length - 1 ? " " : ""}
                </span>
              ))}
            </div>
          </div>
        </AbsoluteFill>
      );
    }
  }
  return null;
};
