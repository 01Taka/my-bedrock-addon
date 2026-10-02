import { Block, ItemStack } from "@minecraft/server";

/**
 * スニークなしで右クリックしたときに固有のUIや動作が発動するインタラクティブブロックかを判定
 */
export function isInteractiveBlock(block: Block): boolean {
  const typeId = block.typeId;
  return (
    typeId.includes("chest") ||
    typeId.includes("shulker_box") ||
    typeId.includes("barrel") ||
    typeId.includes("furnace") ||
    typeId.includes("smoker") ||
    typeId.includes("table") || // crafting_table, smithing_table, cartography_table, etc.
    typeId.includes("anvil") ||
    typeId.includes("door") ||
    typeId.includes("gate") ||
    typeId.includes("button") ||
    typeId.includes("lever") ||
    typeId.includes("bed") ||
    typeId.includes("hopper") ||
    typeId.includes("dispenser") ||
    typeId.includes("dropper") ||
    typeId.includes("lectern") ||
    typeId.includes("cauldron") ||
    typeId.includes("brewing_stand") ||
    typeId.includes("bell") ||
    typeId.includes("beacon") ||
    typeId.includes("respawn_anchor") ||
    typeId.includes("jukebox") ||
    typeId.includes("note_block") ||
    typeId.includes("grindstone") ||
    typeId.includes("stonecutter") ||
    typeId.includes("loom") ||
    typeId.includes("crafter") ||
    typeId.includes("daylight_detector") ||
    typeId.includes("repeater") ||
    typeId.includes("comparator")
  );
}

/**
 * メインハンドがたいまつ設置を許可する状態（素手・剣・つるはし）かを判定
 */
export function isAllowedMainhandItem(itemStack: ItemStack | undefined): boolean {
  // 素手
  if (!itemStack) return true;

  const typeId = itemStack.typeId;
  // 剣 または つるはし
  return typeId.endsWith("_sword") || typeId.endsWith("_pickaxe");
}
