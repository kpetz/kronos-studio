import { random } from "remotion";

/**
 * Stop-motion helpers (style guide, "Motion"). Everything is a pure function of
 * the frame and a seed, so renders are deterministic. Use the shot id as the seed.
 */

/** Frames a pose is held: "on twos" at 24 fps is 12 poses per second. */
export const HOLD_FRAMES = 2;

/** Index of the pose that is on screen at this frame. */
export function poseNumber(frame: number, hold = HOLD_FRAMES): number {
  return Math.floor(Math.max(0, frame) / hold);
}

/** The frame snapped to the start of its pose. Feed this to interpolate() for character motion. */
export function onTwos(frame: number, hold = HOLD_FRAMES): number {
  return poseNumber(frame, hold) * hold;
}

/** Position offset in pixels, new for every pose, within ±amplitude. */
export function jitter(
  frame: number,
  seed: string,
  amplitude = 1.5,
  hold = HOLD_FRAMES,
): { x: number; y: number } {
  const pose = poseNumber(frame, hold);
  return {
    x: (random(`${seed}-x-${pose}`) * 2 - 1) * amplitude,
    y: (random(`${seed}-y-${pose}`) * 2 - 1) * amplitude,
  };
}

/** Exposure multiplier around 1, new for every pose. */
export function flicker(frame: number, seed: string, amount = 0.02, hold = HOLD_FRAMES): number {
  return 1 + (random(`${seed}-f-${poseNumber(frame, hold)}`) * 2 - 1) * amount;
}

/**
 * Which of a shot's poses to show: cycles through them, holding each for
 * `holdPoses` poses. A shot with one pose always shows that pose.
 */
export function poseIndex(frame: number, poseCount: number, holdPoses = 4, hold = HOLD_FRAMES): number {
  if (poseCount <= 1) return 0;
  return Math.floor(poseNumber(frame, hold) / holdPoses) % poseCount;
}

/**
 * Scale for something that lands with a squash (the rubber stamp, an impact):
 * three held poses — wide and flat, slight overshoot, settled.
 */
export function squash(frame: number, hold = HOLD_FRAMES): { x: number; y: number } {
  const poses = [
    { x: 1.28, y: 0.74 },
    { x: 0.94, y: 1.08 },
    { x: 1.03, y: 0.98 },
  ];
  return poses[poseNumber(frame, hold)] ?? { x: 1, y: 1 };
}
