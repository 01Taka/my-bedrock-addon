import {
  world,
  Dimension,
  Vector3,
  BlockPermutation,
  Player,
  EquipmentSlot,
} from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import { TORCH_LIGHT_LEVELS, ActiveLightData } from "./constants";

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

    // もし既にライトブロックが存在し、アドオン配置でない場合はワールド既存のライトなので上書きしない
    const key = getLightPosKey(dimension.id, position);
    if (isLightBlock(block.typeId) && !addonPlacedLights.has(key)) {
      return false;
    }

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
 * 単一のライトブロックを安全に消去する（アドオン配置かつ他プレイヤーが使っていない場合のみ）
 */
export function removeLight(
  dimension: Dimension,
  position: Vector3,
  playerId?: string,
) {
  const key = getLightPosKey(dimension.id, position);
  // アドオンが配置したものでなければ、ワールド既存のライトブロックなので絶対に消去しない
  if (!addonPlacedLights.has(key)) {
    return;
  }

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
export function clearPreviousLight(playerId: string) {
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
}
