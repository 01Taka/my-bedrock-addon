import {
  Player,
  EntityEquippableComponent,
  EquipmentSlot,
  ItemDurabilityComponent,
  ItemStack,
  EnchantmentType,
  ItemComponentTypes,
} from "@minecraft/server";

export function getMainHandItemInfo(player: Player) {
  const equippable = player.getComponent("minecraft:equippable") as
    | EntityEquippableComponent
    | undefined;
  if (!equippable) return null;

  const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
  if (!mainhandItem) return null;

  const durability = mainhandItem.getComponent("minecraft:durability") as
    | ItemDurabilityComponent
    | undefined;

  const unbreaking = getEnchantmentLevel(mainhandItem, "unbreaking");
  const fortune = getEnchantmentLevel(mainhandItem, "fortune");
  const silkTouch = getEnchantmentLevel(mainhandItem, "silk_touch");

  return {
    equippable,
    mainhandItem,
    durability,
    enchant: {
      unbreaking,
      fortune,
      silkTouch,
    },
  };
}

/**
 * アイテムの指定したエンチャントのレベルを取得する関数
 * @param item - 対象のアイテム
 * @param enchantment - 取得したいエンチャントのIDまたはEnchantmentType (例: "unbreaking", "fortune", "efficiency")
 * @returns エンチャントのレベル（付いていない場合は 0）
 */
export function getEnchantmentLevel(
  item: ItemStack,
  enchantment: string | EnchantmentType,
): number {
  if (!item) return 0;

  const enchantable = item.getComponent(ItemComponentTypes.Enchantable);
  if (!enchantable) return 0;

  const result = enchantable.getEnchantment(enchantment);

  if (result) {
    return result.level; // 1, 2, 3 などのレベルを返す
  }

  return 0; // エンチャントが付いていない場合
}
