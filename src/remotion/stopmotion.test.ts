import { describe, expect, it } from "vitest";
import { flicker, jitter, onTwos, poseIndex, poseNumber, squash } from "./stopmotion";

describe("on twos", () => {
  it("holds each pose for two frames", () => {
    expect([0, 1, 2, 3, 4, 5].map((f) => poseNumber(f))).toEqual([0, 0, 1, 1, 2, 2]);
    expect([0, 1, 2, 3, 4, 5].map((f) => onTwos(f))).toEqual([0, 0, 2, 2, 4, 4]);
  });
});

describe("jitter", () => {
  it("is the same within a pose and for the same seed", () => {
    expect(jitter(10, "s01")).toEqual(jitter(11, "s01"));
    expect(jitter(10, "s01")).toEqual(jitter(10, "s01"));
  });

  it("changes between poses and between shots", () => {
    expect(jitter(10, "s01")).not.toEqual(jitter(12, "s01"));
    expect(jitter(10, "s01")).not.toEqual(jitter(10, "s02"));
  });

  it("stays within the amplitude", () => {
    for (let f = 0; f < 200; f++) {
      const { x, y } = jitter(f, "s01", 1.5);
      expect(Math.abs(x)).toBeLessThanOrEqual(1.5);
      expect(Math.abs(y)).toBeLessThanOrEqual(1.5);
    }
  });
});

describe("flicker", () => {
  it("stays close to 1 and holds for the pose", () => {
    for (let f = 0; f < 200; f++) {
      expect(Math.abs(flicker(f, "s01") - 1)).toBeLessThanOrEqual(0.02);
    }
    expect(flicker(20, "s01")).toBe(flicker(21, "s01"));
  });
});

describe("poseIndex", () => {
  it("always shows the only pose of a single-pose shot", () => {
    expect(poseIndex(57, 1)).toBe(0);
    expect(poseIndex(57, 0)).toBe(0);
  });

  it("cycles through poses, holding each for four poses (eight frames)", () => {
    expect([0, 7, 8, 15, 16, 24].map((f) => poseIndex(f, 3))).toEqual([0, 0, 1, 1, 2, 0]);
  });
});

describe("squash", () => {
  it("lands in three held poses and then settles", () => {
    expect(squash(0)).toEqual(squash(1));
    expect(squash(0).x).toBeGreaterThan(1);
    expect(squash(0).y).toBeLessThan(1);
    expect(squash(2)).not.toEqual(squash(0));
    expect(squash(6)).toEqual({ x: 1, y: 1 });
  });
});
