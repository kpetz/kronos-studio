import { useMemo, type FC, type ReactNode } from "react";
import { AbsoluteFill, Sequence, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import type { Episode } from "../schemas/episode";
import { buildTimeline, type TimedBeat } from "../timeline/timeline";
import { Captions } from "./components/Captions";
import {
  ContinuaraCard,
  DatoRealStamp,
  EpisodeTag,
  QuestionCard,
  RecapBanner,
  ScreenText,
} from "./components/Overlays";
import { ShotCard } from "./components/ShotCard";
import type { EpisodeProps } from "./props";
import { palette } from "./theme";

/** Display names for the caption name tag. Ids come from data/series/characters.json. */
const SPEAKER_NAMES: Record<string, string> = {
  narrador: "Narrador",
  kronos: "Kronos",
  junior: "Junior",
  jefe: "Jefe",
  casandra: "Casandra",
  cliente: "Cliente",
  legal: "Legal",
};

/** The stamp must stay on screen at least this long (bible, quality checklist). */
const STAMP_MIN_SEC = 3;

export const calculateEpisodeMetadata: CalculateMetadataFunction<EpisodeProps> = ({ props }) => {
  const { fps, formats, wordsPerSecond } = props.render;
  const timeline = buildTimeline(props.episode, { fps, wordsPerSecond });
  return {
    fps,
    width: formats[props.format].width,
    height: formats[props.format].height,
    durationInFrames: Math.max(1, timeline.durationInFrames),
    defaultOutName: `${props.episode.id}-${props.format}`,
  };
};

/** When each kind of on-screen text enters, as a frame offset inside its beat. */
function overlayStart(style: string, beatFrames: number, fps: number): number {
  switch (style) {
    case "tag":
    case "recap":
      return 0;
    case "screen":
      return Math.round(beatFrames * 0.3);
    case "question":
      return Math.round(beatFrames * 0.35);
    case "continuara":
      return Math.max(0, beatFrames - Math.min(2 * fps, Math.round(beatFrames * 0.45)));
    case "stamp":
      // As early as needed for the stamp to hold its minimum time.
      return Math.max(0, Math.min(Math.round(beatFrames * 0.15), beatFrames - STAMP_MIN_SEC * fps));
    default:
      return 0;
  }
}

const BeatOverlays: FC<{ beat: TimedBeat; episode: Episode }> = ({ beat, episode }) => {
  const { fps } = useVideoConfig();
  const beatFrames = beat.endFrame - beat.startFrame;
  return (
    <>
      {beat.onScreenText.map((item, i) => {
        let content: ReactNode;
        switch (item.style) {
          case "tag":
            content = <EpisodeTag text={item.text} />;
            break;
          case "recap":
            content = <RecapBanner text={item.text} />;
            break;
          case "screen":
            content = <ScreenText text={item.text} />;
            break;
          case "question":
            content = <QuestionCard text={item.text} />;
            break;
          case "continuara":
            content = <ContinuaraCard text={item.text} />;
            break;
          case "stamp":
            content = <DatoRealStamp text={item.text} steps={episode.tip?.steps ?? []} />;
            break;
          default:
            return null; // "caption" text is spoken text; the Captions layer shows it.
        }
        const from = overlayStart(item.style, beatFrames, fps);
        return (
          <Sequence key={i} name={`${item.style}`} from={from} durationInFrames={Math.max(1, beatFrames - from)}>
            {content}
          </Sequence>
        );
      })}
    </>
  );
};

/**
 * Renders any episode.json. Data-driven: nothing here knows about a particular episode.
 * Shots without a picture show a placeholder card, which makes this an animatic
 * until the storyboard and pictures exist.
 */
export const EpisodeComposition: FC<EpisodeProps> = ({ episode, render }) => {
  const { fps } = useVideoConfig();
  const timeline = useMemo(
    () => buildTimeline(episode, { fps, wordsPerSecond: render.wordsPerSecond }),
    [episode, fps, render.wordsPerSecond],
  );

  return (
    <AbsoluteFill style={{ backgroundColor: palette.dark }}>
      {timeline.beats.map((beat, beatIndex) => (
        <Sequence
          key={beat.id}
          name={`${beat.id} ${beat.name}`}
          from={beat.startFrame}
          durationInFrames={beat.endFrame - beat.startFrame}
        >
          {beat.shots.map((shot) => (
            <Sequence
              key={shot.id}
              name={shot.id}
              from={shot.startFrame - beat.startFrame}
              durationInFrames={shot.endFrame - shot.startFrame}
            >
              <ShotCard beat={beat} shot={shot} beatIndex={beatIndex} />
            </Sequence>
          ))}
          <BeatOverlays beat={beat} episode={episode} />
        </Sequence>
      ))}
      <Captions timeline={timeline} safeZone={render.captionSafeZone} speakerNames={SPEAKER_NAMES} />
    </AbsoluteFill>
  );
};
