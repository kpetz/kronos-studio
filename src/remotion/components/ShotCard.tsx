import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import type { TimedBeat, TimedShot } from "../../timeline/timeline";
import { flicker, jitter } from "../stopmotion";
import { cardColors, fonts, palette } from "../theme";

function clock(frame: number, fps: number): string {
  const sec = frame / fps;
  const m = Math.floor(sec / 60);
  const s = (sec - m * 60).toFixed(1).padStart(4, "0");
  return `${m}:${s}`;
}

/**
 * Placeholder for a shot that has no picture yet: says what the shot is and
 * what should be seen, so timing and pacing can be judged in the animatic.
 */
export const ShotCard: FC<{ beat: TimedBeat; shot: TimedShot; beatIndex: number }> = ({
  beat,
  shot,
  beatIndex,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const vertical = height > width;
  const unit = Math.min(width, height) / 1080;
  const seed = `${beat.id}-${shot.id}`;
  const offset = jitter(frame, seed);
  const s = shot.shot;

  const heading = s ? `${beat.id} · ${s.id} · tipo ${s.type}` : `${beat.id} · ${beat.name}`;
  const details = s
    ? [s.framing, s.set, s.characters.join(", ")].filter(Boolean).join(" · ")
    : "sin storyboard";

  return (
    <AbsoluteFill
      style={{
        backgroundColor: cardColors[beatIndex % cardColors.length],
        filter: `brightness(${flicker(frame, seed)})`,
      }}
    >
      <AbsoluteFill
        style={{
          translate: `${offset.x}px ${offset.y}px`,
          padding: vertical ? `${200 * unit}px ${130 * unit}px 0 ${70 * unit}px` : `${150 * unit}px ${240 * unit}px 0 ${90 * unit}px`,
          color: palette.dark,
          fontFamily: fonts.body,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontFamily: fonts.heavy, fontSize: 44 * unit, textTransform: "uppercase" }}>
            {heading}
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 28 * unit, opacity: 0.7 }}>
            {clock(shot.startFrame, fps)}–{clock(shot.endFrame, fps)}
          </div>
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: 26 * unit, opacity: 0.7, marginTop: 6 * unit }}>
          ANIMATIC · {details}
        </div>
        <div
          style={{
            marginTop: 34 * unit,
            fontSize: (vertical ? 40 : 36) * unit,
            lineHeight: 1.3,
            fontWeight: 600,
            maxWidth: vertical ? undefined : "70%",
          }}
        >
          {beat.visual}
        </div>
        {beat.sfx.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 * unit, marginTop: 28 * unit }}>
            {beat.sfx.map((cue, i) => (
              <div
                key={`${cue.id}-${i}`}
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 24 * unit,
                  padding: `${6 * unit}px ${14 * unit}px`,
                  borderRadius: 999,
                  backgroundColor: "rgba(31, 28, 24, 0.82)",
                  color: palette.paper,
                }}
              >
                ♪ {cue.id}
              </div>
            ))}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
