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

export const DEATH_COLOR_NAME = "death_red" as const;
export const DEATH_COLOR_RGB: RGB = { r: 1.0, g: 0.0, b: 0.0 }; // 完全な真っ赤

export type WaypointColorName = BannerColorName | typeof DEATH_COLOR_NAME;

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

export const WAYPOINT_COLOR_RGBS: Record<WaypointColorName, RGB> = {
  ...BANNER_COLOR_RGBS,
  [DEATH_COLOR_NAME]: DEATH_COLOR_RGB,
};

// name -> 日本語名
export const BANNER_COLOR_JAPANESE: Record<BannerColorName, string> = {
  black: "黒",
  red: "赤",
  green: "緑",
  brown: "茶",
  blue: "青",
  purple: "紫",
  cyan: "青緑",
  light_gray: "薄灰色",
  gray: "灰色",
  pink: "桃色",
  lime: "黄緑",
  yellow: "黄",
  light_blue: "空色",
  magenta: "赤紫",
  orange: "橙",
  white: "白",
};

export const WAYPOINT_COLOR_JAPANESE: Record<WaypointColorName, string> = {
  ...BANNER_COLOR_JAPANESE,
  [DEATH_COLOR_NAME]: "死亡地点",
};

// name -> チャットカラーコード
export const BANNER_COLOR_CHAT_CODES: Record<BannerColorName, string> = {
  black: "§0",
  red: "§c",
  green: "§2",
  brown: "§6",
  blue: "§9",
  purple: "§5",
  cyan: "§3",
  light_gray: "§7",
  gray: "§8",
  pink: "§d",
  lime: "§a",
  yellow: "§e",
  light_blue: "§b",
  magenta: "§5",
  orange: "§6",
  white: "§f",
};

export const WAYPOINT_COLOR_CHAT_CODES: Record<WaypointColorName, string> = {
  ...BANNER_COLOR_CHAT_CODES,
  [DEATH_COLOR_NAME]: "§c",
};

/**
 * プレイヤー付近のHUD非表示および表示・非表示のトグル可能範囲（メートル）
 */
export const WAYPOINT_PROXIMITY_RANGE = 4.0;

// ウェイポイントの型定義
export interface Waypoint {
  readonly dim: string;
  readonly pos: Vector3;
  readonly color: WaypointColorName;
  readonly name: string | null;
  readonly creatorId?: string; // 配置したプレイヤーID
  readonly createdAt?: string; // 設置日時 (ISO 8601文字列)
  readonly source?: string; // 生成ソース (例: "death")
}

/**
 * ウェイポイントの描画色RGBを取得（死亡地点は完全な真っ赤）
 */
export function getWaypointRGB(waypoint: Waypoint): RGB {
  if (waypoint.source === "death" || waypoint.color === DEATH_COLOR_NAME) {
    return DEATH_COLOR_RGB;
  }
  return WAYPOINT_COLOR_RGBS[waypoint.color] ?? { r: 1, g: 1, b: 1 };
}

/**
 * ウェイポイントの一意キーを取得
 */
export function getWaypointKey(wp: Waypoint): string {
  const shortDim = wp.dim.replace(/^minecraft:/, "");
  return `${shortDim}@${Math.floor(wp.pos.x)},${Math.floor(wp.pos.y)},${Math.floor(wp.pos.z)}`;
}

/**
 * ウェイポイントの表示名を取得（name が null または空文字の場合は色の日本語訳を返す）
 */
export function getWaypointDisplayName(wp: Waypoint): string {
  if (wp.name !== null && wp.name.trim() !== "") {
    return wp.name;
  }
  return WAYPOINT_COLOR_JAPANESE[wp.color] ?? "ウェイポイント";
}
