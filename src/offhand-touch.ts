import {
  world,
  system,
  EquipmentSlot,
  Player,
  Vector3,
  BlockPermutation,
  Direction,
  Dimension,
} from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";

// 対象とするたいまつとそれぞれの明るさレベル (0〜15)
const TORCH_LIGHT_LEVELS: Record<string, number> = {
  "minecraft:torch": 14, // 通常のたいまつ
  "minecraft:soul_torch": 10, // 魂のたいまつ
  "minecraft:copper_torch": 14, // 銅のたいまつ
  "minecraft:redstone_torch": 7, // レッドストーンたいまつ
};

// プレイヤーごとに「直前に置いたライトブロックの情報（明るさレベル含む）」を記録するマップ
export const activeLights = new Map<
  string,
  {
    dimensionId: string;
    level: number;
    locations: Vector3[];
  }
>();

/**
 * light_block および light_block_0 〜 light_block_15 をすべて検知する判定関数
 */
function isLightBlock(typeId: string): boolean {
  return (
    typeId === "minecraft:light_block" ||
    typeId.startsWith("minecraft:light_block_")
  );
}

/**
 * 空気またはライトブロック（光源を置ける場所）かを判定
 */
function isAirOrLightBlock(typeId: string): boolean {
  return typeId === "minecraft:air" || isLightBlock(typeId);
}

/**
 * プレイヤーのオフハンドにあるたいまつの明るさを取得
 */
function getOffhandTorchLightLevel(
  player: Player,
): { typeId: string; level: number } | null {
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return null;

  const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);
  if (!offhandItem) return null;

  const level = TORCH_LIGHT_LEVELS[offhandItem.typeId];
  if (level === undefined) return null;

  return { typeId: offhandItem.typeId, level };
}

/**
 * 単一のライトブロックを安全に消去する
 */
function removeLight(dimension: Dimension, position: Vector3) {
  try {
    const block = dimension.getBlock(position);
    if (block && isLightBlock(block.typeId)) {
      block.setType("minecraft:air");
    }
  } catch (e) {
    // チャンク未ロード等の例外対策
  }
}

/**
 * 単一のライトブロックを配置する
 */
function placeLight(
  dimension: Dimension,
  position: Vector3,
  level: number,
): boolean {
  try {
    const block = dimension.getBlock(position);
    if (!block || !isAirOrLightBlock(block.typeId)) return false;

    const lightPermutation = BlockPermutation.resolve("minecraft:light_block", {
      block_light_level: level,
    });
    block.setPermutation(lightPermutation);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * プレイヤーの全ライトブロックを安全に消去する
 */
function clearPreviousLight(playerId: string) {
  const previous = activeLights.get(playerId);
  if (!previous) return;

  try {
    const dimension = world.getDimension(previous.dimensionId);
    for (const position of previous.locations) {
      removeLight(dimension, position);
    }
  } catch (e) {
    // 例外発生時は無視
  }

  activeLights.delete(playerId);
}

/**
 * プレイヤーの周囲でライトを置ける最適な座標を探す
 */
function findSuitableLightPosition(
  player: Player,
): { pos: Vector3; type: "足元" | "頭" } | null {
  const footPos = Vector3Utils.floor(player.location);
  const headPos = { x: footPos.x, y: footPos.y + 1, z: footPos.z };

  const dimension = player.dimension;

  // 1. 足元のチェック（air または light_block）
  const footBlock = dimension.getBlock(footPos);
  if (footBlock && isAirOrLightBlock(footBlock.typeId)) {
    return { pos: footPos, type: "足元" };
  }

  // 2. 足元がブロックで埋まっている場合は頭の高さ（Y+1）をチェック
  const headBlock = dimension.getBlock(headPos);
  if (headBlock && isAirOrLightBlock(headBlock.typeId)) {
    return { pos: headPos, type: "頭" };
  }

  return null;
}

// 各面（Direction）に対する隣接座標のオフセット定義
const faceOffsets = {
  [Direction.Up]: { x: 0, y: 1, z: 0 },
  [Direction.Down]: { x: 0, y: -1, z: 0 },
  [Direction.North]: { x: 0, y: 0, z: -1 },
  [Direction.South]: { x: 0, y: 0, z: 1 },
  [Direction.East]: { x: 1, y: 0, z: 0 },
  [Direction.West]: { x: -1, y: 0, z: 0 },
};

/**
 * 視線方向のブロックを取得する関数
 */
function getLookAtBlock(player: Player, maxDistance = 10) {
  const dimension = player.dimension;

  const hit = player.getBlockFromViewDirection({
    maxDistance: maxDistance,
    includeLiquidBlocks: true,
    includePassableBlocks: true,
  });

  if (hit) {
    const offset = faceOffsets[hit.face];
    const adjacentLocation = Vector3Utils.add(hit.block.location, offset);
    return dimension.getBlock(adjacentLocation);
  } else {
    const headLocation = player.getHeadLocation();
    const viewDirection = player.getViewDirection();
    const targetLocation = Vector3Utils.add(
      headLocation,
      Vector3Utils.scale(viewDirection, maxDistance),
    );
    return dimension.getBlock(targetLocation);
  }
}

// ==========================================
// 1. 動的光源ループ（2tick = 0.1秒間隔）
// ==========================================
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const playerId = player.id;

    if (!player.isValid || !playerId) {
      clearPreviousLight(playerId);
      continue;
    }

    const torchInfo = getOffhandTorchLightLevel(player);

    // たいまつを持っていない場合
    if (!torchInfo) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }

    const prev = activeLights.get(playerId);
    const dimension = player.dimension;

    // 【追加】明るさレベルまたはディメンションが変わったら、一度すべてのライトを取り除く
    if (
      prev &&
      (prev.level !== torchInfo.level || prev.dimensionId !== dimension.id)
    ) {
      clearPreviousLight(playerId);
    }

    // 新たに配置したいターゲット座標のリスト
    const newTargetLocations: Vector3[] = [];

    // ① プレイヤー自身（足元/頭）のライト座標
    const suitablePos = findSuitableLightPosition(player);
    if (suitablePos) {
      newTargetLocations.push(suitablePos.pos);
    }

    // ② 【追加】スニークしている間だけ視線の先の座標を追加（スニーク解除時は追加されない）
    if (player.isSneaking) {
      const lookAtDistances = [5, 10];
      for (const dist of lookAtDistances) {
        const block = getLookAtBlock(player, dist);
        if (block && isAirOrLightBlock(block.typeId)) {
          // リスト内の重複チェック
          if (
            !newTargetLocations.some((pos) =>
              Vector3Utils.equals(pos, block.location),
            )
          ) {
            newTargetLocations.push(block.location);
          }
        }
      }
    }

    // 配置できる場所が1つもない場合
    if (newTargetLocations.length === 0) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }

    // 前回の配置情報を取得（レベルが変わって消去された場合は undefined）
    const currentPrev = activeLights.get(playerId);
    const prevLocations = currentPrev ? currentPrev.locations : [];

    // 【差分更新 1】前回の座標のうち、今回の座標に含まれないブロックを消去（スニーク解除時の視線先など）
    for (const prevPos of prevLocations) {
      const isStillNeeded = newTargetLocations.some((newPos) =>
        Vector3Utils.equals(newPos, prevPos),
      );
      if (!isStillNeeded) {
        removeLight(dimension, prevPos);
      }
    }

    // 【差分更新 2】同じ座標はスキップし、新規座標のみ配置
    const finalizedLocations: Vector3[] = [];
    for (const targetPos of newTargetLocations) {
      const alreadyPlaced = prevLocations.some((prevPos) =>
        Vector3Utils.equals(prevPos, targetPos),
      );

      if (alreadyPlaced) {
        // すでに前回の配置と同じ座標にある場合は再配置をスキップ（光の再計算を抑制）
        finalizedLocations.push(targetPos);
      } else {
        // 新しい座標にのみ配置
        const success = placeLight(dimension, targetPos, torchInfo.level);
        if (success) {
          finalizedLocations.push(targetPos);
        }
      }
    }

    // activeLightsの更新（明るさレベルも含めて保存）
    activeLights.set(playerId, {
      dimensionId: dimension.id,
      level: torchInfo.level,
      locations: finalizedLocations,
    });
  }
}, 2);

// ==========================================
// 2. 残留防止イベントリスナー（即時消去）
// ==========================================

world.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity instanceof Player) {
    clearPreviousLight(event.deadEntity.id);
  }
});

world.afterEvents.playerDimensionChange.subscribe((event) => {
  clearPreviousLight(event.player.id);
});

world.afterEvents.playerLeave.subscribe((event) => {
  clearPreviousLight(event.playerId);
});

// ==========================================
// 3. スニーク右クリックによるたいまつ持ち替え処理
// ==========================================
export function handleTorchSwap(player: Player, cancelCallback: () => void) {
  if (!player.isSneaking) return;

  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;

  const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
  const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);

  // ① メインハンド ➔ オフハンド
  if (
    mainhandItem &&
    mainhandItem.typeId in TORCH_LIGHT_LEVELS &&
    !offhandItem
  ) {
    cancelCallback();
    system.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.offhand 0 ${mainhandItem.typeId} ${mainhandItem.amount}`,
      );
      equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
    });
    return;
  }

  // ② オフハンド ➔ メインハンド
  if (
    !mainhandItem &&
    offhandItem &&
    offhandItem.typeId in TORCH_LIGHT_LEVELS
  ) {
    cancelCallback();
    system.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.mainhand 0 ${offhandItem.typeId} ${offhandItem.amount}`,
      );
      player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
    });
    return;
  }
}
