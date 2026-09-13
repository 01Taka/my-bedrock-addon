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
import {
  HOOKSHOT_BLAST_CONFIG,
  HOOKSHOT_ITEM_ID,
  isHoldingHookshot,
  isBlastJumpReady,
  resetBlastJump,
  consumeBlastJump,
  executeBlastJump,
  updateBlastHud,
  handleBlastJumpButtonInput,
  setJumpButtonReleasedInAir,
  setHookshotLandedInAir,
  handlePlayerGroundTouch,
  handleBlastJumpDamage,
  isFallDamageImmune,
  startFallDamageImmunity,
  clearFallDamageImmunity,
  updateFallDamageImmunity,
} from "./blast-jump";
import { handleHookshotEntityHit } from "./combat";
import { HookshotParticleConfig, HookshotBlastConfig } from "./types";

/**
 * フックショットのパーティクル設定
 */
export const HOOKSHOT_PARTICLE_CONFIG: HookshotParticleConfig = {
  /** 軌道パーティクル（エンドロッド光線ビーム） */
  TRAIL_PARTICLE: "minecraft:endrod",
  /** 着弾地点パーティクル（エンドロッドの光エフェクト） */
  HIT_PARTICLE: "minecraft:endrod",
  /** 軌道パーティクルの配置間隔（0.25ブロック間隔で隙間のない直線ビームを形成） */
  STEP_DISTANCE: 0.25,
  /** 空振り時のパーティクル描画最大距離 */
  MISS_DISTANCE: 30,
};

export {
  PLAYER_MOVEMENT_CONFIG,
  ENTITY_PULL_CONFIG,
  HEAVY_ENTITY_TYPES,
  HOOKSHOT_BLAST_CONFIG,
  HOOKSHOT_ITEM_ID,
  HookshotBlastConfig,
  isHoldingHookshot,
  isBlastJumpReady,
  resetBlastJump,
  consumeBlastJump,
  executeBlastJump,
  updateBlastHud,
  handleBlastJumpButtonInput,
  setJumpButtonReleasedInAir,
  setHookshotLandedInAir,
  handlePlayerGroundTouch,
  handleHookshotEntityHit,
  handleBlastJumpDamage,
  isFallDamageImmune,
  startFallDamageImmunity,
  clearFallDamageImmunity,
  updateFallDamageImmunity,
  executePlayerMovementToBlock,
  executePlayerMovementToEntity,
  executeEntityPull,
};

/**
 * 2点間にパーティクルを高密度に直線状にスポーンしてビーム状の射出軌跡を描画
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
    const px = start.x + stepX * i;
    const py = start.y + stepY * i;
    const pz = start.z + stepZ * i;

    try {
      // エンドロッドの白いビーム光
      dimension.spawnParticle(config.TRAIL_PARTICLE, {
        x: px,
        y: py,
        z: pz,
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

  // 発射瞬間のシフト（スニーク）状態を記録
  const isSneaking = player.isSneaking;

  // 通常のアイテム使用動作をキャンセル
  cancelCallback();

  // 次の tick で安全に実行（beforeEvent 内での Entity 操作対応）
  system.run(() => {
    executeHookshot(player, isSneaking);
  });
}

/**
 * フックショットのレイキャスト判定および機能ディスパッチ
 * @param player 発射者
 * @param isSneaking 発射瞬間のスニーク状態（true: モブ引き寄せモード / false: 自身移動モード）
 */
export function executeHookshot(
  player: Player,
  isSneaking: boolean = player.isSneaking,
): boolean {
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

    // フックショット着弾により爆風ジャンプをリセットし、着弾後フェーズに設定
    setHookshotLandedInAir(player, true);
    resetBlastJump(player);
    updateBlastHud(player);

    if (isSneaking) {
      // 【シフト時】モブ引き寄せモード（大型モブでなければ引き寄せ、大型モブ時は自身も移動しない）
      if (!isHeavyEntity(targetEntity)) {
        return executeEntityPull(player, targetEntity);
      }
      return true;
    } else {
      // 【非シフト時】自分自身の移動モード（対象エンティティに向かって移動）
      return executePlayerMovementToEntity(player, targetEntity);
    }
  }

  // ブロックに当たった場合
  if (blockHitPos) {
    // 軌道と着弾エフェクトの描画
    spawnHookshotTrail(player.dimension, startPos, blockHitPos);
    spawnHookshotImpact(player.dimension, blockHitPos);

    // フックショット着弾により爆風ジャンプをリセットし、着弾後フェーズに設定
    setHookshotLandedInAir(player, true);
    resetBlastJump(player);
    updateBlastHud(player);

    if (isSneaking) {
      // 【シフト時】壁に当たっても自分自身は移動しない
      return true;
    } else {
      // 【非シフト時】プレイヤーがブロックに向かって移動
      return executePlayerMovementToBlock(player, blockHitPos);
    }
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

