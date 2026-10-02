import { Player, Vector3, Direction, Block } from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import { isAirOrLightBlock } from "./light-block-manager";

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
 * プレイヤーの周囲でライトを置ける最適な座標を探す
 */
export function findSuitableLightPosition(
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

/**
 * 視線方向のブロックを取得する関数
 */
export function getLookAtBlock(player: Player, maxDistance = 10): Block | undefined {
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
