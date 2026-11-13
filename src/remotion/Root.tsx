import type { FC } from "react";
import { Composition } from "remotion";
import { calculateEpisodeMetadata, EpisodeComposition } from "./Episode";
import { sampleProps } from "./props";

/**
 * One data-driven composition. `pnpm studio render <episode>` and
 * `pnpm studio preview <episode>` pass the real episode as input props;
 * size, frame rate and duration are computed from them.
 */
export const RemotionRoot: FC = () => {
  return (
    <Composition
      id="Episode"
      component={EpisodeComposition}
      calculateMetadata={calculateEpisodeMetadata}
      defaultProps={sampleProps}
      width={1080}
      height={1920}
      fps={24}
      durationInFrames={24}
    />
  );
};
