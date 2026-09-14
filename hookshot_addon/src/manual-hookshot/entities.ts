import { Entity, Player } from "@minecraft/server";

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
 * 引き寄せ不可（代わりにプレイヤーが接近・着弾対象となる）大型モブ・ボスのリスト
 */
export const HEAVY_ENTITY_TYPES: readonly string[] = [
  "minecraft:iron_golem",
  "minecraft:warden",
  "minecraft:ender_dragon",
  "minecraft:wither",
  "minecraft:elder_guardian",
  "minecraft:ravager",
  "minecraft:ghast",
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
