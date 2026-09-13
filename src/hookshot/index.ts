import {
  Player,
  ItemUseBeforeEvent,
  system,
  Vector3,
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

export {
  PLAYER_MOVEMENT_CONFIG,
  ENTITY_PULL_CONFIG,
  HEAVY_ENTITY_TYPES,
  executePlayerMovementToBlock,
  executePlayerMovementToEntity,
  executeEntityPull,
};

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
    blockHitPos = blockHit.faceLocation ?? {
      x: blockHit.block.location.x + 0.5,
      y: blockHit.block.location.y + 0.5,
      z: blockHit.block.location.z + 0.5,
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

    // (A) 重量・ボスモブ等の場合はプレイヤーがエンティティに向かって移動
    if (isHeavyEntity(targetEntity)) {
      return executePlayerMovementToEntity(player, targetEntity);
    }

    // (B) 通常モブ・プレイヤー等の場合はモブを引き寄せる
    return executeEntityPull(player, targetEntity);
  }

  // ブロックに当たった場合 -> プレイヤーがブロックに向かって移動
  if (blockHitPos) {
    return executePlayerMovementToBlock(player, blockHitPos);
  }

  // 4. 何もヒットしなかった場合
  player.playSound("note.bass", { pitch: 0.5, volume: 0.3 });
  return false;
}
