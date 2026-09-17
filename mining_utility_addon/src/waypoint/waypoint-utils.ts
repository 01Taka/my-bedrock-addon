import {
  world,
  Dimension,
  Vector3,
  MolangVariableMap,
  Player,
} from "@minecraft/server";
import { waypointCache } from "./store-waypoint";
import { BANNER_COLOR_RGBS } from "./waypoint.types";
import {
  getPlayerVirtualNav,
  getCurrentVirtualOffset,
  getFocusedWaypoint,
  getWaypointKey,
  isPlayerHoldingCompass,
  getPinnedWaypointKey,
} from "./virtual-nav";

/**
 * 変換済みのRGBカラー (0.0 ~ 1.0)
 */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/**
 * ウェイポイントパーティクル表示オプション（ディメンション全体向け）
 */
export interface WaypointParticleOptions {
  /** ディメンション (Dimension オブジェクト または "overworld", "minecraft:overworld" 等の文字列) */
  dimension: Dimension | string;
  /** 表示する絶対ワールド座標 */
  location: Vector3;
  /** 既にRGB変換済みの色 (各成分 0.0 ~ 1.0) */
  color: RGBColor;
  /** マーカーのサイズ (ブロック単位, 例: 0.6) */
  size: number;
  /** パーティクルの表示時間 (tick単位。20 tick = 1秒) */
  durationTicks: number;
}

/**
 * 特定プレイヤー向けプライベートパーティクル表示オプション
 */
export interface PlayerWaypointParticleOptions {
  /** 表示対象のプレイヤー */
  player: Player;
  /** 表示する絶対ワールド座標 */
  location: Vector3;
  /** 既にRGB変換済みの色 (各成分 0.0 ~ 1.0) */
  color: RGBColor;
  /** マーカーのサイズ (ブロック単位, 例: 0.6) */
  size: number;
  /** パーティクルの表示時間 (tick単位。20 tick = 1秒) */
  durationTicks: number;
  /** ディメンション制限 (任意。指定時、プレイヤーが別ディメンションにいれば描画しない) */
  dimension?: Dimension | string;
}

/**
 * 指定した絶対座標に、指定時間（durationTicks）動的に表示され続けるウェイポイントパーティクルをスポーンする。
 * （ディメンション内にいる全プレイヤーに見えるグローバル表示）
 *
 * @param options { dimension, location, color, size, durationTicks }
 */
export function spawnWaypointParticle(options: WaypointParticleOptions): void {
  const { dimension, location, color, size, durationTicks } = options;

  if (!location) return;

  const dim =
    typeof dimension === "string"
      ? world.getDimension(
          dimension.includes(":") ? dimension : `minecraft:${dimension}`,
        )
      : dimension;

  // tick (20 tick = 1秒) を秒数 (float) に変換
  const lifetimeSeconds = Math.max(0.05, durationTicks / 20.0);

  const molang = new MolangVariableMap();
  molang.setFloat("variable.marker_size", Math.max(0.01, size));
  molang.setFloat("variable.color.r", color.r);
  molang.setFloat("variable.color.g", color.g);
  molang.setFloat("variable.color.b", color.b);
  molang.setFloat("variable.lifetime", lifetimeSeconds);
  molang.setColorRGB("variable.color", {
    red: color.r,
    green: color.g,
    blue: color.b,
  });

  dim.spawnParticle("mining_utility:hud_marker", location, molang);
}

/**
 * 【特定プレイヤー専用】指定したプレイヤーの画面にのみ、指定時間（durationTicks）表示されるウェイポイントパーティクルをスポーンする。
 *
 * player.spawnParticle を使用するためパケットが対象プレイヤー端末にしか送信されず、
 * 真横に他のプレイヤーが立っていても完全に不可視（完全プライベート）となります。
 * Molang の variable.lifetime により、マイクラ本体のパーティクルエンジンで指定時間生存・自動消滅します。
 *
 * @param options { player, location, color, size, durationTicks, dimension? }
 */
export function spawnWaypointParticleForPlayer(
  options: PlayerWaypointParticleOptions,
): void {
  const { player, location, color, size, durationTicks, dimension } = options;

  if (!player || !player.isValid || !location) return;

  // ディメンション制限チェック（指定がある場合、プレイヤーが同ディメンションにいるか確認）
  if (dimension) {
    const dimId =
      typeof dimension === "string"
        ? dimension.includes(":")
          ? dimension
          : `minecraft:${dimension}`
        : dimension.id;
    if (player.dimension.id !== dimId) return;
  }

  // tick (20 tick = 1秒) を秒数 (float) に変換
  const lifetimeSeconds = Math.max(0.05, durationTicks / 20.0);

  const molang = new MolangVariableMap();
  molang.setFloat("variable.marker_size", Math.max(0.01, size));
  molang.setFloat("variable.color.r", color.r);
  molang.setFloat("variable.color.g", color.g);
  molang.setFloat("variable.color.b", color.b);
  molang.setFloat("variable.lifetime", lifetimeSeconds);
  molang.setColorRGB("variable.color", {
    red: color.r,
    green: color.g,
    blue: color.b,
  });

  try {
    player.spawnParticle("mining_utility:hud_marker", location, molang);
  } catch (e) {
    console.error("[WaypointUtils] プレイヤー専用パーティクル表示エラー:", e);
  }
}

export const HUD_GRAY_COLOR: RGBColor = { r: 0.45, g: 0.45, b: 0.45 };

export const HUD_MARKER_CONFIG = {
  baseSize: 1,
  projectionDistance: 1.5,
  minSize: 0.03,
  maxSize: 2.5,
  focusZoom: 2.0,
};

export function displayHUDWaypoints(player: Player) {
  if (!player || !player.isValid) return;

  // コンパスを持っていないプレイヤーにはHUDマーカーを非表示にする
  if (!isPlayerHoldingCompass(player)) return;

  const headLoc = player.getHeadLocation();
  const dimension = player.dimension;
  const offset = getCurrentVirtualOffset(player);
  const isVirtual =
    Math.abs(offset.x) > 0.05 ||
    Math.abs(offset.y) > 0.05 ||
    Math.abs(offset.z) > 0.05;

  const focusedWp = getFocusedWaypoint(player);
  const focusedKey = focusedWp ? getWaypointKey(focusedWp) : null;

  const pinnedKey = getPinnedWaypointKey(player);
  // 固定の際にコンパスを所持して、固定あり、シフトなしの場合、固定されたHUDのパーティクル以外は灰色に変える
  const isGrayMode = pinnedKey !== null && !player.isSneaking;

  // 仮想前進時の視点座標（前進していない場合は実際の頭座標）
  const originX = headLoc.x + offset.x;
  const originY = headLoc.y + offset.y;
  const originZ = headLoc.z + offset.z;

  for (let waypoint of waypointCache) {
    try {
      const waypointDimension = waypoint.dim.includes(":")
        ? waypoint.dim
        : `minecraft:${waypoint.dim}`;
      if (waypointDimension !== dimension.id) continue;

      const targetX = waypoint.pos.x;
      const targetY = waypoint.pos.y;
      const targetZ = waypoint.pos.z;

      const dx = targetX - originX;
      const dy = targetY - (originY - 0.5);
      const dz = targetZ - originZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      // 通常時かつ4m未満の至近距離は実体表示で十分なためスキップ
      if (!isVirtual && dist < 4.0) continue;

      // ゼロ除算防止
      const safeDist = Math.max(0.1, dist);

      // 投影位置: プレイヤーの現在位置から、仮想視点でのターゲット方向へ投影
      const projDist = HUD_MARKER_CONFIG.projectionDistance;
      const projX = headLoc.x + (dx / safeDist) * projDist;
      const projY = headLoc.y + (dy / safeDist) * projDist;
      const projZ = headLoc.z + (dz / safeDist) * projDist;

      // 相似比に基づく見かけサイズ
      const wpKey = getWaypointKey(waypoint);
      const isFocused = focusedKey !== null && wpKey === focusedKey;
      const sizeMultiplier = isFocused ? HUD_MARKER_CONFIG.focusZoom : 1.0;

      const apparentSize = HUD_MARKER_CONFIG.baseSize * (projDist / safeDist);
      const finalSize = Math.min(
        HUD_MARKER_CONFIG.maxSize,
        Math.max(HUD_MARKER_CONFIG.minSize, apparentSize) * sizeMultiplier,
      );

      // 固定されたHUDパーティクル以外は灰色に変える（シフト中は通常色）
      const isPinned = pinnedKey !== null && wpKey === pinnedKey;
      const color =
        isGrayMode && !isPinned
          ? HUD_GRAY_COLOR
          : BANNER_COLOR_RGBS[waypoint.color];

      // プレイヤー専用パーティクルとして描画（個人別HUD表示、毎tick更新のため寿命2tick）
      spawnWaypointParticleForPlayer({
        player,
        dimension: waypointDimension,
        location: { x: projX, y: projY, z: projZ },
        color,
        size: finalSize,
        durationTicks: 2,
      });
    } catch {}
  }
}
