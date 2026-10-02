import {
  world,
  Dimension,
  Vector3,
  BlockPermutation,
  Player,
  EquipmentSlot,
} from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import {
  TORCH_LIGHT_LEVELS,
  ActiveLightData,
  TORCH_SAVED_LIGHTS_PROP,
} from "./constants";

// プレイヤーごとに「直前に置いたライトブロックの情報」を記録するマップ
export const activeLights = new Map<string, ActiveLightData>();

// アドオンが動的に配置したライトブロック座標の追跡セット（ワールド既存のライトブロックを保護）
export const addonPlacedLights = new Set<string>();

/**
 * light_block および light_block_0 〜 light_block_15 をすべて検知する判定関数
 */
export function isLightBlock(typeId: string): boolean {
  return (
    typeId === "minecraft:light_block" ||
    typeId.startsWith("minecraft:light_block_")
  );
}

/**
 * 空気またはライトブロック（光源を置ける場所）かを判定
 */
export function isAirOrLightBlock(typeId: string): boolean {
  return typeId === "minecraft:air" || isLightBlock(typeId);
}

/**
 * プレイヤーのオフハンドにあるたいまつの明るさを取得
 */
export function getOffhandTorchLightLevel(
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

export function getLightPosKey(dimensionId: string, pos: Vector3): string {
  return `${dimensionId}@${pos.x},${pos.y},${pos.z}`;
}

/**
 * 他のプレイヤーが現在その座標を光源として必要としているか判定（プレイヤー同士の消去競合を回避）
 */
export function isLightNeededByOtherPlayers(
  excludingPlayerId: string,
  dimensionId: string,
  position: Vector3,
): boolean {
  for (const [pId, lightData] of activeLights.entries()) {
    if (pId === excludingPlayerId) continue;
    if (lightData.dimensionId !== dimensionId) continue;
    for (const loc of lightData.locations) {
      if (Vector3Utils.equals(loc, position)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 単一のライトブロックを配置する
 */
export function placeLight(
  dimension: Dimension,
  position: Vector3,
  level: number,
): boolean {
  try {
    const block = dimension.getBlock(position);
    if (!block || !isAirOrLightBlock(block.typeId)) return false;

    const key = getLightPosKey(dimension.id, position);

    const lightPermutation = BlockPermutation.resolve("minecraft:light_block", {
      block_light_level: level,
    });
    block.setPermutation(lightPermutation);
    addonPlacedLights.add(key);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * 単一のライトブロックを安全に消去する（他プレイヤーが使っていない場合のみ）
 */
export function removeLight(
  dimension: Dimension,
  position: Vector3,
  playerId?: string,
) {
  const key = getLightPosKey(dimension.id, position);

  // 他プレイヤーがこの座標を光源として利用中の場合は消去しない
  if (playerId && isLightNeededByOtherPlayers(playerId, dimension.id, position)) {
    return;
  }

  try {
    const block = dimension.getBlock(position);
    if (block && isLightBlock(block.typeId)) {
      block.setType("minecraft:air");
    }
    addonPlacedLights.delete(key);
  } catch (e) {
    // チャンク未ロード等の例外対策
  }
}

/**
 * プレイヤーの全ライトブロックを安全に消去する
 */
export function clearPreviousLight(playerId: string, player?: Player) {
  const previous = activeLights.get(playerId);
  if (!previous) return;

  try {
    const dimension = world.getDimension(previous.dimensionId);
    for (const position of previous.locations) {
      removeLight(dimension, position, playerId);
    }
  } catch (e) {
    // 例外発生時は無視
  }

  activeLights.delete(playerId);
  if (player) {
    saveActiveLights(player, undefined);
  }
}

/**
 * ワールド内のすべてのアドオン配置ライトブロックを一括強制消去する
 * （シングルプレイ退出時や全プレイヤー切断時の確実なクリーンアップ）
 */
export function clearAllLights(): void {
  for (const [playerId, lightData] of activeLights.entries()) {
    try {
      const dimension = world.getDimension(lightData.dimensionId);
      for (const pos of lightData.locations) {
        removeLight(dimension, pos, playerId);
      }
    } catch {}
  }
  activeLights.clear();

  // addonPlacedLights に残っているすべてのライトブロック座標を空気へ戻す
  for (const key of addonPlacedLights) {
    try {
      const [dimensionId, coords] = key.split("@");
      const [x, y, z] = coords.split(",").map(Number);
      const dimension = world.getDimension(dimensionId);
      const block = dimension.getBlock({ x, y, z });
      if (block && isLightBlock(block.typeId)) {
        block.setType("minecraft:air");
      }
    } catch {}
  }
  addonPlacedLights.clear();
}

/**
 * プレイヤーのライト配置情報を DynamicProperty に保存
 */
export function saveActiveLights(
  player: Player,
  data: ActiveLightData | undefined,
): void {
  try {
    if (data && data.locations.length > 0) {
      player.setDynamicProperty(TORCH_SAVED_LIGHTS_PROP, JSON.stringify(data));
    } else {
      player.setDynamicProperty(TORCH_SAVED_LIGHTS_PROP, undefined);
    }
  } catch (e) {
    // 例外対策
  }
}

/**
 * プレイヤーがワールドに入った時、前回セッションで残ってしまったライトブロックを安全に消去する
 */
export function restoreAndClearSavedLights(player: Player): void {
  try {
    // 1. DynamicProperties に保存されていた前回セッションのライトブロックを消去
    const raw = player.getDynamicProperty(TORCH_SAVED_LIGHTS_PROP);
    if (typeof raw === "string") {
      try {
        const savedData = JSON.parse(raw) as ActiveLightData;
        if (
          savedData &&
          savedData.dimensionId &&
          Array.isArray(savedData.locations)
        ) {
          const dimension = world.getDimension(savedData.dimensionId);
          for (const pos of savedData.locations) {
            try {
              const block = dimension.getBlock(pos);
              if (block && isLightBlock(block.typeId)) {
                block.setType("minecraft:air");
              }
              const key = getLightPosKey(savedData.dimensionId, pos);
              addonPlacedLights.delete(key);
            } catch {}
          }
        }
      } catch {}
      player.setDynamicProperty(TORCH_SAVED_LIGHTS_PROP, undefined);
    }

    // 2. プレイヤーのログイン位置（足元・頭）にあるライトブロックもクリーンアップ
    const footPos = Vector3Utils.floor(player.location);
    const headPos = { x: footPos.x, y: footPos.y + 1, z: footPos.z };
    const dimension = player.dimension;

    for (const pos of [footPos, headPos]) {
      try {
        const block = dimension.getBlock(pos);
        if (block && isLightBlock(block.typeId)) {
          block.setType("minecraft:air");
          const key = getLightPosKey(dimension.id, pos);
          addonPlacedLights.delete(key);
        }
      } catch {}
    }
  } catch (e) {
    // 例外対策
  }
}
