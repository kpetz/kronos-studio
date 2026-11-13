import type { FC } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { squash } from "../stopmotion";
import { fonts, outline, palette } from "../theme";

/**
 * On-screen text is always rendered here, never generated inside a picture, so
 * the Spanish is always correct. Overlays are crisp and cut in; only the stamp moves.
 */

function useUnit(): { unit: number; vertical: boolean } {
  const { width, height } = useVideoConfig();
  return { unit: Math.min(width, height) / 1080, vertical: height > width };
}

/** Episode or part number, visible in the first shot. */
export const EpisodeTag: FC<{ text: string }> = ({ text }) => {
  const { unit } = useUnit();
  return (
    <div
      style={{
        position: "absolute",
        top: "3%",
        left: "5%",
        fontFamily: fonts.heavy,
        fontSize: 38 * unit,
        textTransform: "uppercase",
        color: palette.dark,
        backgroundColor: palette.mustard,
        padding: `${8 * unit}px ${22 * unit}px`,
        borderRadius: 10 * unit,
        border: `${4 * unit}px solid ${palette.dark}`,
      }}
    >
      {text}
    </div>
  );
};

/** "Anteriormente..." banner over a recap. */
export const RecapBanner: FC<{ text: string }> = ({ text }) => {
  const { unit } = useUnit();
  return (
    <div
      style={{
        position: "absolute",
        top: "3%",
        right: "14%",
        fontFamily: fonts.heavy,
        fontSize: 38 * unit,
        fontStyle: "italic",
        color: palette.paper,
        backgroundColor: "rgba(31, 28, 24, 0.85)",
        padding: `${8 * unit}px ${22 * unit}px`,
        borderRadius: 10 * unit,
      }}
    >
      {text}
    </div>
  );
};

/** Text shown on a prop: a monitor, a sheet of paper, a camera feed, a sign. */
export const ScreenText: FC<{ text: string }> = ({ text }) => {
  const { unit, vertical } = useUnit();
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? "38%" : "44%",
        left: vertical ? "8%" : "22%",
        right: vertical ? "14%" : "22%",
        fontFamily: fonts.mono,
        fontSize: 40 * unit,
        lineHeight: 1.3,
        color: palette.screenGreen,
        backgroundColor: "#0d140d",
        padding: `${26 * unit}px ${30 * unit}px`,
        borderRadius: 14 * unit,
        border: `${5 * unit}px solid ${palette.dark}`,
      }}
    >
      {text}
    </div>
  );
};

/** The question a miniseries part ends on. */
export const QuestionCard: FC<{ text: string }> = ({ text }) => {
  const { unit, vertical } = useUnit();
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? "35%" : "40%",
        left: "8%",
        right: vertical ? "14%" : "8%",
        textAlign: "center",
        fontFamily: fonts.heavy,
        fontSize: 92 * unit,
        lineHeight: 1.08,
        color: palette.mustard,
        ...outline(18 * unit),
      }}
    >
      {text}
    </div>
  );
};

/** "Continuará..." card. */
export const ContinuaraCard: FC<{ text: string }> = ({ text }) => {
  const { unit, vertical } = useUnit();
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? "50%" : "60%",
        left: 0,
        right: vertical ? "6%" : 0,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontFamily: fonts.heavy,
          fontSize: 58 * unit,
          fontStyle: "italic",
          color: palette.paper,
          backgroundColor: palette.dark,
          padding: `${12 * unit}px ${36 * unit}px`,
          borderRadius: 12 * unit,
        }}
      >
        {text}
      </div>
    </div>
  );
};

/**
 * "DATO REAL": a red rubber stamp, slightly rotated, that lands with a
 * three-pose squash, over a dark card with the numbered steps of the tip.
 */
export const DatoRealStamp: FC<{ text: string; steps: string[] }> = ({ text, steps }) => {
  const frame = useCurrentFrame();
  const { unit, vertical } = useUnit();
  const landing = squash(frame);
  return (
    <div
      style={{
        position: "absolute",
        top: vertical ? "32%" : "36%",
        left: vertical ? "8%" : "20%",
        right: vertical ? "14%" : "20%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 26 * unit,
      }}
    >
      <div
        style={{
          rotate: "-6deg",
          scale: `${landing.x} ${landing.y}`,
          fontFamily: fonts.heavy,
          fontSize: 96 * unit,
          letterSpacing: 4 * unit,
          color: palette.brick,
          border: `${12 * unit}px solid ${palette.brick}`,
          borderRadius: 18 * unit,
          padding: `${4 * unit}px ${34 * unit}px`,
          backgroundColor: "rgba(243, 234, 214, 0.92)",
        }}
      >
        {text}
      </div>
      {steps.length > 0 ? (
        <div
          style={{
            alignSelf: "stretch",
            backgroundColor: "rgba(31, 28, 24, 0.92)",
            color: palette.white,
            fontFamily: fonts.body,
            fontWeight: 700,
            fontSize: 40 * unit,
            lineHeight: 1.3,
            padding: `${24 * unit}px ${32 * unit}px`,
            borderRadius: 14 * unit,
          }}
        >
          {steps.map((step, i) => (
            <div key={i}>
              {i + 1}. {step}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
};
