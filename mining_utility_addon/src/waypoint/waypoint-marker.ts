import { world, Dimension, Vector3, Entity } from "@minecraft/server";
import {
  Waypoint,
  getWaypointDisplayName,
  getWaypointKey,
  BANNER_COLOR_CHAT_CODES,
} from "./waypoint.types";
import { waypointCache } from "./store-waypoint";

export const WAYPOINT_MARKER_TYPE = "mining_utility:waypoint_marker";
export const WAYPOINT_MARKER_TAG = "waypoint_marker";

/**
 * ディメンションオブジェクトを確実に取得
 */
function resolveDimension(dim: Dimension | string): Dimension | null {
  try {
    if (typeof dim !== "string") return dim;
    const formatted = dim.includes(":") ? dim : `minecraft:${dim}`;
    return world.getDimension(formatted);
  } catch {
    return null;
  }
}

/**
 * ウェイポイントのネームタグ用文字列を生成（カラーコード + 表示名）
 */
export function getWaypointMarkerNameTag(waypoint: Waypoint): string {
  const colorCode = BANNER_COLOR_CHAT_CODES[waypoint.color] ?? "§f";
  const displayName = getWaypointDisplayName(waypoint);
  return `${colorCode}${displayName}`;
}

/**
 * ウェイポイントの座標にネームタグマーカーエンティティをスポーン
 */
export function spawnWaypointMarker(
  dimension: Dimension | string,
  waypoint: Waypoint,
): Entity | null {
  const dim = resolveDimension(dimension);
  if (!dim) return null;

  const key = getWaypointKey(waypoint);

  try {
    // 既に同キーのマーカーが存在していれば重複作成を避ける
    const existing = dim.getEntities({
      type: WAYPOINT_MARKER_TYPE,
      tags: [`wp_id:${key}`],
    });
    if (existing.length > 0) {
      const marker = existing[0];
      marker.nameTag = getWaypointMarkerNameTag(waypoint);
      return marker;
    }

    // パーティクル位置（ブロック中央 y+0.5）にスポーン
    const marker = dim.spawnEntity(WAYPOINT_MARKER_TYPE, waypoint.pos);
    marker.nameTag = getWaypointMarkerNameTag(waypoint);
    marker.addTag(WAYPOINT_MARKER_TAG);
    marker.addTag(`wp_id:${key}`);

    return marker;
  } catch {
    // チャンク未ロード等でスポーンに失敗した場合は無視（定期同期で再試行）
    return null;
  }
}

/**
 * 指定したウェイポイントキーに対応するマーカーエンティティを削除
 */
export function removeWaypointMarker(
  dimension: Dimension | string,
  waypointKey: string,
  location?: Vector3,
): void {
  const dim = resolveDimension(dimension);
  if (!dim) return;

  try {
    // 1. タグによる検索・削除
    const taggedMarkers = dim.getEntities({
      type: WAYPOINT_MARKER_TYPE,
      tags: [`wp_id:${waypointKey}`],
    });
    for (const marker of taggedMarkers) {
      try {
        marker.remove();
      } catch {}
    }

    // 2. 座標指定がある場合、念のため周辺1.5m以内のマーカーも削除（フォールバック）
    if (location) {
      const nearMarkers = dim.getEntities({
        type: WAYPOINT_MARKER_TYPE,
        location,
        maxDistance: 1.5,
      });
      for (const marker of nearMarkers) {
        try {
          marker.remove();
        } catch {}
      }
    }
  } catch {}
}

/**
 * 全ディメンションのマーカーエンティティと waypointCache の同期を実行
 * - 削除済みウェイポイントの孤立マーカーを削除
 * - ロード中チャンクでマーカーが存在しないウェイポイントにマーカーを再スポーン
 */
export function syncWaypointMarkers(): void {
  const activeKeys = new Set<string>();
  const waypointsByKey = new Map<string, Waypoint>();

  for (const wp of waypointCache) {
    const key = getWaypointKey(wp);
    activeKeys.add(key);
    waypointsByKey.set(key, wp);
  }

  const dimensionIds = [
    "minecraft:overworld",
    "minecraft:nether",
    "minecraft:the_end",
  ];

  for (const dimId of dimensionIds) {
    const dim = resolveDimension(dimId);
    if (!dim) continue;

    try {
      const existingMarkers = dim.getEntities({
        type: WAYPOINT_MARKER_TYPE,
      });

      const spawnedKeysInDim = new Set<string>();

      for (const marker of existingMarkers) {
        const tags = marker.getTags();
        const idTag = tags.find((t) => t.startsWith("wp_id:"));

        if (idTag) {
          const key = idTag.replace(/^wp_id:/, "");
          if (!activeKeys.has(key)) {
            // ウェイポイント一覧に存在しない孤立マーカーを削除
            try {
              marker.remove();
            } catch {}
          } else {
            spawnedKeysInDim.add(key);
            // ネームタグが最新の表示名と一致しているか更新
            const wp = waypointsByKey.get(key);
            if (wp) {
              const expectedNameTag = getWaypointMarkerNameTag(wp);
              if (marker.nameTag !== expectedNameTag) {
                marker.nameTag = expectedNameTag;
              }
            }
          }
        }
      }

      // このディメンションに属するウェイポイントのうち、まだマーカーがないものをスポーン試行
      const shortDimId = dimId.replace(/^minecraft:/, "");
      for (const wp of waypointCache) {
        if (wp.dim !== shortDimId && wp.dim !== dimId) continue;
        const key = getWaypointKey(wp);
        if (!spawnedKeysInDim.has(key)) {
          spawnWaypointMarker(dim, wp);
        }
      }
    } catch {}
  }
}
