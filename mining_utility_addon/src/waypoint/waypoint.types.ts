import { Vector3 } from "@minecraft/server";

export interface BannerColorInfo {
  name: string;
  r: number;
  g: number;
  b: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// id -> name
export const BANNER_COLOR_NAMES = {
  0: "black",
  1: "red",
  2: "green",
  3: "brown",
  4: "blue",
  5: "purple",
  6: "cyan",
  7: "light_gray",
  8: "gray",
  9: "pink",
  10: "lime",
  11: "yellow",
  12: "light_blue",
  13: "magenta",
  14: "orange",
  15: "white",
} as const;

export type BannerColorId = keyof typeof BANNER_COLOR_NAMES;
export type BannerColorName = (typeof BANNER_COLOR_NAMES)[BannerColorId];

// name -> rgb
export const BANNER_COLOR_RGBS: Record<BannerColorName, RGB> = {
  black: { r: 0.1137, g: 0.1137, b: 0.1294 },
  red: { r: 0.6902, g: 0.1804, b: 0.149 },
  green: { r: 0.3686, g: 0.4863, b: 0.0863 },
  brown: { r: 0.5137, g: 0.3294, b: 0.1961 },
  blue: { r: 0.2353, g: 0.2667, b: 0.6667 },
  purple: { r: 0.5373, g: 0.1961, b: 0.7216 },
  cyan: { r: 0.0863, g: 0.6118, b: 0.6118 },
  light_gray: { r: 0.6157, g: 0.6157, b: 0.5922 },
  gray: { r: 0.2784, g: 0.3098, b: 0.3216 },
  pink: { r: 0.9529, g: 0.5451, b: 0.6667 },
  lime: { r: 0.502, g: 0.7804, b: 0.1216 },
  yellow: { r: 0.9961, g: 0.8471, b: 0.2392 },
  light_blue: { r: 0.2275, g: 0.702, b: 0.8549 },
  magenta: { r: 0.7804, g: 0.3059, b: 0.7412 },
  orange: { r: 0.9765, g: 0.502, b: 0.1137 },
  white: { r: 0.9765, g: 1.0, b: 0.9961 },
};

// ウェイポイントの型定義
export interface Waypoint {
  readonly dim: string;
  readonly pos: Vector3;
  readonly color: BannerColorName;
  readonly name: string;
}
