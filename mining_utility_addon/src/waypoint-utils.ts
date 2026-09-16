import {
  world,
  Dimension,
  Vector3,
  MolangVariableMap,
  Player,
} from "@minecraft/server";

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
  molang.setFloat("variable.color_r", color.r);
  molang.setFloat("variable.color_g", color.g);
  molang.setFloat("variable.color_b", color.b);
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
  molang.setFloat("variable.color_r", color.r);
  molang.setFloat("variable.color_g", color.g);
  molang.setFloat("variable.color_b", color.b);
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
