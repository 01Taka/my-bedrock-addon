import { world, Dimension, Vector3, Entity } from "@minecraft/server";
import {
  Waypoint,
  getWaypointDisplayName,
  getWaypointKey,
  WAYPOINT_COLOR_CHAT_CODES,
} from "./waypoint.types";
import { waypointCache, getWaypointAt } from "./store-waypoint";

export const WAYPOINT_MARKER_TYPE = "mining_utility:waypoint_marker";
export const WAYPOINT_MARKER_TAG = "waypoint_marker";

/**
 * プレイヤーがウェイポイントの1マス上（Y+1）に立っているウェイポイントのキー一覧を取得
 */
export function getLoweredWaypointKeys(): Set<string> {
  const loweredKeys = new Set<string>();
  for (const player of world.getAllPlayers()) {
    if (!player || !player.isValid) continue;
    const pLoc = player.location;
    const px = Math.floor(pLoc.x);
    const py = Math.floor(pLoc.y);
    const pz = Math.floor(pLoc.z);

    // プレイヤーが1マス上(Y+1)にいる場合（真下1マスがウェイポイント）
    const wpBelow1 = getWaypointAt(player.dimension, {
      x: px,
      y: py - 1,
      z: pz,
    });
    if (wpBelow1) {
      loweredKeys.add(getWaypointKey(wpBelow1));
    }
  }
  return loweredKeys;
}

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
  const colorCode = WAYPOINT_COLOR_CHAT_CODES[waypoint.color] ?? "§f";
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
  // 死亡によるウェイポイントはネームタグを表示しない
  if (waypoint.source === "death") return null;

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
    if (wp.source === "death") continue;
    const key = getWaypointKey(wp);
    activeKeys.add(key);
    waypointsByKey.set(key, wp);
  }

  const loweredKeys = getLoweredWaypointKeys();

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
            const wp = waypointsByKey.get(key);
            if (wp) {
              // ネームタグが最新の表示名と一致しているか更新
              const expectedNameTag = getWaypointMarkerNameTag(wp);
              if (marker.nameTag !== expectedNameTag) {
                marker.nameTag = expectedNameTag;
              }

              // 水流やブロック押し出しによる位置ずれの補正、および真上プレイヤー検知による一時降下
              const isLowered = loweredKeys.has(key);
              const targetY = isLowered ? wp.pos.y - 1 : wp.pos.y;
              const targetPos: Vector3 = {
                x: wp.pos.x,
                y: targetY,
                z: wp.pos.z,
              };

              const loc = marker.location;
              const dx = loc.x - targetPos.x;
              const dy = loc.y - targetPos.y;
              const dz = loc.z - targetPos.z;
              if (dx * dx + dy * dy + dz * dz > 0.0025) {
                try {
                  marker.teleport(targetPos, { dimension: dim });
                  marker.clearVelocity();
                } catch {}
              }
            }
          }
        }
      }

      // このディメンションに属するウェイポイントのうち、まだマーカーがないものをスポーン試行
      const shortDimId = dimId.replace(/^minecraft:/, "");
      for (const wp of waypointCache) {
        if (wp.source === "death") continue;
        if (wp.dim !== shortDimId && wp.dim !== dimId) continue;
        const key = getWaypointKey(wp);
        if (!spawnedKeysInDim.has(key)) {
          spawnWaypointMarker(dim, wp);
        }
      }
    } catch {}
  }
}

/**
 * ウェイポイントマーカーの位置調整および位置ズレ補正
 * - ウェイポイントの1マス上(Y+1)にプレイヤーがいる場合:
 *   ネームタグエンティティの座標を一時的に1マス下げて(Y-1)ブロック設置を可能にする
 * - それ以外の場合:
 *   本来のウェイポイント座標(Y)に配置
 * - 水流やピストン等でずれた場合も目標位置へ即座に引き戻す
 */
export function correctWaypointMarkerPositions(): void {
  if (waypointCache.length === 0) return;

  const loweredKeys = getLoweredWaypointKeys();

  const waypointsByKey = new Map<string, Waypoint>();
  for (const wp of waypointCache) {
    waypointsByKey.set(getWaypointKey(wp), wp);
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
      const markers = dim.getEntities({
        type: WAYPOINT_MARKER_TYPE,
      });

      for (const marker of markers) {
        if (!marker.isValid) continue;

        const tags = marker.getTags();
        const idTag = tags.find((t) => t.startsWith("wp_id:"));
        if (!idTag) continue;

        const key = idTag.replace(/^wp_id:/, "");
        const wp = waypointsByKey.get(key);
        if (!wp) continue;

        const isLowered = loweredKeys.has(key);
        const targetY = isLowered ? wp.pos.y - 1 : wp.pos.y;
        const targetPos: Vector3 = {
          x: wp.pos.x,
          y: targetY,
          z: wp.pos.z,
        };

        const loc = marker.location;
        const dx = loc.x - targetPos.x;
        const dy = loc.y - targetPos.y;
        const dz = loc.z - targetPos.z;

        // 0.05m 以上ずれた場合にテレポート & 速度ゼロ化
        if (dx * dx + dy * dy + dz * dz > 0.0025) {
          try {
            marker.teleport(targetPos, { dimension: dim });
            marker.clearVelocity();
          } catch {}
        }
      }
    } catch {}
  }
}
