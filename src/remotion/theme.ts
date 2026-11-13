import type { CSSProperties } from "react";

/** Colours and type from docs/STYLE_GUIDE.md. */

export const palette = {
  beige: "#d8c7a3",
  olive: "#7c8048",
  teal: "#2f7f7b",
  mustard: "#e0a92b",
  brick: "#b4452f",
  dark: "#1f1c18",
  paper: "#f3ead6",
  white: "#ffffff",
  screenGreen: "#7dff8a",
};

/** Muted backgrounds for placeholder cards, cycled per beat so cuts are visible. */
export const cardColors = ["#cbb894", "#a9ad7f", "#8fb3ad", "#d9bd77", "#c99483"];

/** Colour of the speaker name tag above the captions. Unlisted speakers are white. */
export const speakerColors: Record<string, string> = {
  narrador: palette.white,
  kronos: "#58d66b",
  junior: "#3fb8b1",
  jefe: "#e2523c",
  casandra: "#a3a85c",
};

/**
 * System fonts for the animatic. The final captions and stamp need licensed
 * fonts stored in assets/fonts (style guide, "Captions and type").
 */
export const fonts = {
  heavy: '"Arial Black", "Helvetica Neue", Arial, sans-serif',
  body: '"Helvetica Neue", Arial, sans-serif',
  mono: 'Menlo, "Courier New", monospace',
};

/** Dark outline that keeps white text readable over any picture. */
export function outline(px: number): CSSProperties {
  return {
    WebkitTextStroke: `${px}px ${palette.dark}`,
    paintOrder: "stroke fill",
  };
}
