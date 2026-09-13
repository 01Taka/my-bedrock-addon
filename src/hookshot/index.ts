import {
  Player,
  ItemUseBeforeEvent,
  system,
  Vector3,
  Dimension,
} from "@minecraft/server";
import {
  PLAYER_MOVEMENT_CONFIG,
  executePlayerMovementToBlock,
  executePlayerMovementToEntity,
} from "./player-movement";
import {
  ENTITY_PULL_CONFIG,
  HEAVY_ENTITY_TYPES,
  isHeavyEntity,
  isValidHookshotTarget,
  executeEntityPull,
} from "./entity-pull";
import { HookshotParticleConfig } from "./types";

/**
 * フックショットのパーティクル設定
 */
export const HOOKSHOT_PARTICLE_CONFIG: HookshotParticleConfig = {
  /** 軌道パーティクル（クリティカルの星エフェクト） */
  TRAIL_PARTICLE: "minecraft:crit",
  /** 着弾地点パーティクル（エンドロッドの光エフェクト） */
  HIT_PARTICLE: "minecraft:endrod",
  /** 軌道パーティクルの配置間隔（ブロック単位） */
  STEP_DISTANCE: 0.5,
  /** 空振り時のパーティクル描画最大距離 */
  MISS_DISTANCE: 30,
};

export {
  PLAYER_MOVEMENT_CONFIG,
  ENTITY_PULL_CONFIG,
  HEAVY_ENTITY_TYPES,
  executePlayerMovementToBlock,
  executePlayerMovementToEntity,
  executeEntityPull,
};

/**
 * 2点間にパーティクルを直線状にスポーンして射出軌跡を描画
 */
export function spawnHookshotTrail(
  dimension: Dimension,
  start: Vector3,
  end: Vector3,
  config: HookshotParticleConfig = HOOKSHOT_PARTICLE_CONFIG,
): void {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance <= 0) return;

  const count = Math.max(1, Math.floor(distance / config.STEP_DISTANCE));
  const stepX = dx / count;
  const stepY = dy / count;
  const stepZ = dz / count;

  for (let i = 0; i <= count; i++) {
    try {
      dimension.spawnParticle(config.TRAIL_PARTICLE, {
        x: start.x + stepX * i,
        y: start.y + stepY * i,
        z: start.z + stepZ * i,
      });
    } catch {
      // 範囲外等でのエラー防止
    }
  }
}

/**
 * 着弾地点にインパクトパーティクルをスポーン
 */
export function spawnHookshotImpact(
  dimension: Dimension,
  hitPos: Vector3,
  config: HookshotParticleConfig = HOOKSHOT_PARTICLE_CONFIG,
): void {
  const offsets = [
    { x: 0, y: 0, z: 0 },
    { x: 0.15, y: 0.15, z: 0 },
    { x: -0.15, y: 0.15, z: 0 },
    { x: 0, y: 0.15, z: 0.15 },
    { x: 0, y: 0.15, z: -0.15 },
  ];
  for (const offset of offsets) {
    try {
      dimension.spawnParticle(config.HIT_PARTICLE, {
        x: hitPos.x + offset.x,
        y: hitPos.y + offset.y,
        z: hitPos.z + offset.z,
      });
    } catch {
      // 範囲外等でのエラー防止
    }
  }
}

/** フックショットのアイテムID */
export const HOOKSHOT_ITEM_ID = "addon:hookshot";

/**
 * フックショット使用時の処理ハンドラー
 */
export function handleHookshotUse(
  event: ItemUseBeforeEvent,
  cancelCallback: () => void,
): void {
  const item = event.itemStack;
  if (!item || item.typeId !== HOOKSHOT_ITEM_ID) return;

  const player = event.source;
  if (!(player instanceof Player)) return;

  // 通常のアイテム使用動作をキャンセル
  cancelCallback();

  // 次の tick で安全に実行（beforeEvent 内での Entity 操作対応）
  system.run(() => {
    executeHookshot(player);
  });
}

/**
 * フックショットのレイキャスト判定および機能ディスパッチ
 */
export function executeHookshot(player: Player): boolean {
  const maxDistance = PLAYER_MOVEMENT_CONFIG.MAX_DISTANCE;
  const playerPos = player.location;
  const headPos = player.getHeadLocation();
  const viewDir = player.getViewDirection();

  // 発射開始位置（プレイヤーの目の位置から少し前方）
  const startPos: Vector3 = {
    x: headPos.x + viewDir.x * 0.4,
    y: headPos.y + viewDir.y * 0.4 - 0.1,
    z: headPos.z + viewDir.z * 0.4,
  };

  // 1. 視線方向のエンティティレイキャスト
  const entityHits = player.getEntitiesFromViewDirection({
    maxDistance,
  });

  // 有効なターゲットとなる最も手前のエンティティを取得
  let closestEntityHit: { entity: import("@minecraft/server").Entity; distance: number } | null = null;
  for (const hit of entityHits) {
    if (isValidHookshotTarget(player, hit.entity)) {
      closestEntityHit = hit;
      break; // getEntitiesFromViewDirection は距離順でソートされている
    }
  }

  // 2. 視線方向のブロックレイキャスト（流体や草などの通過可能ブロックは除外）
  const blockHit = player.getBlockFromViewDirection({
    maxDistance,
    includeLiquidBlocks: false,
    includePassableBlocks: false,
  });

  let blockDistance = Number.POSITIVE_INFINITY;
  let blockHitPos: Vector3 | null = null;

  if (blockHit) {
    const blockLoc = blockHit.block.location;
    blockHitPos = blockHit.faceLocation
      ? {
          x: blockLoc.x + blockHit.faceLocation.x,
          y: blockLoc.y + blockHit.faceLocation.y,
          z: blockLoc.z + blockHit.faceLocation.z,
        }
      : {
          x: blockLoc.x + 0.5,
          y: blockLoc.y + 0.5,
          z: blockLoc.z + 0.5,
        };
    blockDistance = Math.hypot(
      blockHitPos.x - playerPos.x,
      blockHitPos.y - playerPos.y,
      blockHitPos.z - playerPos.z,
    );
  }

  // 3. 命中判定の優先度評価
  // エンティティがブロックより手前にある場合 -> エンティティに対する処理
  if (closestEntityHit && closestEntityHit.distance < blockDistance) {
    const targetEntity = closestEntityHit.entity;
    const targetPos = targetEntity.getHeadLocation ? targetEntity.getHeadLocation() : targetEntity.location;

    // 軌道と着弾エフェクトの描画
    spawnHookshotTrail(player.dimension, startPos, targetPos);
    spawnHookshotImpact(player.dimension, targetPos);

    // (A) 重量・ボスモブ等の場合はプレイヤーがエンティティに向かって移動
    if (isHeavyEntity(targetEntity)) {
      return executePlayerMovementToEntity(player, targetEntity);
    }

    // (B) 通常モブ・プレイヤー等の場合はモブを引き寄せる
    return executeEntityPull(player, targetEntity);
  }

  // ブロックに当たった場合 -> プレイヤーがブロックに向かって移動
  if (blockHitPos) {
    // 軌道と着弾エフェクトの描画
    spawnHookshotTrail(player.dimension, startPos, blockHitPos);
    spawnHookshotImpact(player.dimension, blockHitPos);

    return executePlayerMovementToBlock(player, blockHitPos);
  }

  // 4. 何もヒットしなかった場合（空振り時も発射方向にパーティクルを描画）
  const missDistance = Math.min(maxDistance, HOOKSHOT_PARTICLE_CONFIG.MISS_DISTANCE);
  const missEndPos: Vector3 = {
    x: startPos.x + viewDir.x * missDistance,
    y: startPos.y + viewDir.y * missDistance,
    z: startPos.z + viewDir.z * missDistance,
  };
  spawnHookshotTrail(player.dimension, startPos, missEndPos);

  player.playSound("note.bass", { pitch: 0.5, volume: 0.3 });
  return false;
}

