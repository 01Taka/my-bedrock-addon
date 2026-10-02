import { Block, Direction } from "@minecraft/server";
import { hasBlockCollisionFromFace } from "./face-collision";
import { isAirOrLightBlock } from "./light-block-manager";

/**
 * たいまつを支えられない非フルブロック・透過ブロックかを判定
 */
export function isNonSupportingBlock(block: Block): boolean {
  if (block.isAir || block.isLiquid) return true;
  const typeId = block.typeId;
  return (
    typeId.includes("leaves") ||
    typeId.includes("sign") ||
    typeId.includes("torch") ||
    typeId.includes("lantern") ||
    typeId.includes("carpet") ||
    // isInteractiveBlock のうちたいまつが支えられないもの
    typeId.includes("chest") ||
    typeId.includes("door") ||
    typeId.includes("gate") ||
    typeId.includes("button") ||
    typeId.includes("lever") ||
    typeId.includes("bed") ||
    typeId.includes("anvil") ||
    typeId.includes("hopper") ||
    typeId.includes("cauldron") ||
    typeId.includes("brewing_stand") ||
    typeId.includes("lectern") ||
    typeId.includes("bell") ||
    typeId.includes("grindstone") ||
    typeId.includes("stonecutter") ||
    typeId.includes("daylight_detector") ||
    typeId.includes("repeater") ||
    typeId.includes("comparator")
  );
}

/**
 * レイがヒットした面がフルブロック（たいまつを支えられる面）であるかを判定
 */
export function isFullBlockFace(block: Block, face: Direction): boolean {
  // 下面（天井）にはたいまつを設置できない
  if (face === Direction.Down) return false;

  // たいまつを支えられない非フルブロックタイプを除外
  if (isNonSupportingBlock(block)) return false;

  // MCPE-223452のfaceLocationバグに依存せず、面からのレイ照射で実際の当たり判定を検証
  return hasBlockCollisionFromFace(block, face);
}

/**
 * たいまつ設置時に置き換えを許可するブロックかを判定
 * （空気、ライトブロック、背の低い草、背の高い草、落ち葉）
 */
export function isReplaceableForTorch(typeId: string): boolean {
  if (isAirOrLightBlock(typeId)) return true;

  return (
    // 背の低い草
    typeId === "minecraft:short_grass" ||
    typeId === "minecraft:tallgrass" ||
    typeId === "minecraft:fern" ||
    // 背の高い草
    typeId === "minecraft:tall_grass" ||
    typeId === "minecraft:double_plant" ||
    typeId === "minecraft:large_fern" ||
    // 落ち葉
    typeId === "minecraft:leaf_litter" ||
    typeId === "minecraft:pink_petals"
  );
}
