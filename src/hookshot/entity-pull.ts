import { Player, Entity, Vector3, system } from "@minecraft/server";
import { EntityPullConfig } from "./types";
import { HOOKSHOT_BLAST_CONFIG } from "./blast-jump";

/**
 * モブ引き寄せの内部設定
 */
export const ENTITY_PULL_CONFIG: EntityPullConfig = {
  /** 横方向の引き寄せインパルス係数 */
  HORIZONTAL_WEIGHT: 0.7,
  /** Y座標差が閾値（2ブロック）以下のときの基本垂直インパルス（一定） */
  BASE_VERTICAL_IMPULSE: 1.0,
  /** 高低差に応じた垂直インパルス加算を開始するY座標差の閾値（ブロック単位） */
  HEIGHT_DIFF_THRESHOLD: 0.0,
  /** 高低差が閾値を超えた場合に加算する垂直インパルス係数（1ブロックあたり） */
  HEIGHT_DIFF_VERTICAL_WEIGHT: 0.2,
  /** 最大インパルス速度 */
  MAX_IMPULSE_SPEED: 5.0,
  /** プレイヤー手前で止めるためのオフセット距離（ブロック単位） */
  STOP_OFFSET_DISTANCE: 1.0,
  /** 引き寄せ時のサウンドID */
  SOUND_ID: "item.trident.return",
  /** サウンド音量 */
  SOUND_VOLUME: 1.0,
  /** サウンドピッチ */
  SOUND_PITCH: 1.2,
};

/**
 * 引き寄せ不可（代わりにプレイヤーが接近する）大型モブ・ボスのリスト
 */
export const HEAVY_ENTITY_TYPES: readonly string[] = [
  "minecraft:iron_golem",
  "minecraft:warden",
  "minecraft:ender_dragon",
  "minecraft:wither",
  "minecraft:elder_guardian",
  "minecraft:ravager",
];

/**
 * フックショットの対象から完全に除外するエンティティタイプ
 */
export const EXCLUDED_ENTITY_TYPES: readonly string[] = [
  "minecraft:item",
  "minecraft:arrow",
  "minecraft:xp_orb",
  "minecraft:splash_potion",
  "minecraft:lingering_potion",
  "minecraft:egg",
  "minecraft:snowball",
  "minecraft:ender_pearl",
  "minecraft:boat",
  "minecraft:chest_boat",
  "minecraft:minecart",
  "minecraft:chest_minecart",
  "minecraft:command_block_minecart",
  "minecraft:furnace_minecart",
  "minecraft:hopper_minecart",
  "minecraft:tnt_minecart",
  "minecraft:armor_stand",
];

/**
 * エンティティが大型モブ（プレイヤー接近対象）であるか判定
 */
export function isHeavyEntity(entity: Entity): boolean {
  return HEAVY_ENTITY_TYPES.includes(entity.typeId);
}

/**
 * エンティティがフックショットの対象（モブまたはプレイヤー）として有効であるか判定
 */
export function isValidHookshotTarget(player: Player, entity: Entity): boolean {
  // プレイヤー自身は対象外
  if (entity.id === player.id) return false;

  // 有効なエンティティか
  if (!entity.isValid) return false;

  // 除外エンティティリストに含まれる場合は対象外
  if (EXCLUDED_ENTITY_TYPES.includes(entity.typeId)) return false;

  return true;
}

/**
 * モブをプレイヤー手前まで引き寄せる
 */
export function executeEntityPull(
  player: Player,
  targetEntity: Entity,
  config: EntityPullConfig = ENTITY_PULL_CONFIG,
): boolean {
  if (!targetEntity.isValid) return false;

  const playerPos = player.location;
  const entityPos = targetEntity.location;
  const viewDir = player.getViewDirection();

  // プレイヤーの視線前方 STOP_OFFSET_DISTANCE マスの位置を目標地点とする
  const targetX = playerPos.x + viewDir.x * config.STOP_OFFSET_DISTANCE;
  const targetY = playerPos.y;
  const targetZ = playerPos.z + viewDir.z * config.STOP_OFFSET_DISTANCE;

  // エンティティから目標地点へのベクトル
  const deltaX = targetX - entityPos.x;
  const deltaY = targetY - entityPos.y;
  const deltaZ = targetZ - entityPos.z;
  // プレイヤーと対象エンティティの高低差（プレイヤーのy座標 - 対象のy座標）
  const diffY = playerPos.y - entityPos.y;

  // インパルス計算
  let impulseX = deltaX * config.HORIZONTAL_WEIGHT;
  let impulseY = config.BASE_VERTICAL_IMPULSE;
  if (diffY > config.HEIGHT_DIFF_THRESHOLD) {
    impulseY +=
      (diffY - config.HEIGHT_DIFF_THRESHOLD) *
      config.HEIGHT_DIFF_VERTICAL_WEIGHT;
  }
  let impulseZ = deltaZ * config.HORIZONTAL_WEIGHT;

  // 速度ベクトルの大きさを制限
  const speed = Math.hypot(impulseX, impulseY, impulseZ);
  if (speed > config.MAX_IMPULSE_SPEED && speed > 0.0001) {
    const scale = config.MAX_IMPULSE_SPEED / speed;
    impulseX *= scale;
    impulseY *= scale;
    impulseZ *= scale;
  }

  // モブへインパルスを適用
  targetEntity.applyImpulse({
    x: impulseX,
    y: impulseY,
    z: impulseZ,
  });

  // 音の再生（引き寄せ音）
  player.playSound(config.SOUND_ID, {
    volume: config.SOUND_VOLUME,
    pitch: config.SOUND_PITCH,
  });

  // 引き寄せタグを付与し、一定時間（20tick = 1秒）後に自動削除
  try {
    const tag = HOOKSHOT_BLAST_CONFIG.PULLED_TAG;
    targetEntity.addTag(tag);
    system.runTimeout(() => {
      try {
        if (targetEntity.isValid && targetEntity.hasTag(tag)) {
          targetEntity.removeTag(tag);
        }
      } catch {
        // エンティティ消滅時のエラー防止
      }
    }, HOOKSHOT_BLAST_CONFIG.PULL_TAG_DURATION_TICKS);
  } catch {
    // 例外防止
  }

  return true;
}
