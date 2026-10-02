import {
  Block,
  Direction,
  Vector3,
  BlockRaycastOptions,
} from "@minecraft/server";

/**
 * 判定面に対するレイの定義情報
 */
export interface FaceRayDefinition {
  readonly name: string;
  readonly startLocation: Vector3;
  readonly direction: Vector3;
  readonly maxDistance: number;
}

/**
 * 指定した面の隣接ブロックを取得します。
 */
export function getAdjacentBlock(
  block: Block,
  face: Direction,
): Block | undefined {
  switch (face) {
    case Direction.Up:
      return block.above();
    case Direction.Down:
      return block.below();
    case Direction.North:
      return block.north();
    case Direction.South:
      return block.south();
    case Direction.East:
      return block.east();
    case Direction.West:
      return block.west();
    default:
      return undefined;
  }
}

/**
 * 指定した面に対する照射レイ定義（中央1本、または4つ角4本）を生成します。
 */
export function getFaceRayDefinitions(
  block: Block,
  face: Direction,
  isCornerMode: boolean,
): FaceRayDefinition[] {
  const { x, y, z } = block.location;
  const OFFSET = 0.05;
  const C_MIN = 0.15;
  const C_MAX = 0.85;
  const MAX_DIST = 1.1;

  switch (face) {
    case Direction.Up: {
      const dir: Vector3 = { x: 0, y: -1, z: 0 };
      const startY = y + 1.0 + OFFSET;
      if (!isCornerMode) {
        return [
          {
            name: "Center",
            startLocation: { x: x + 0.5, y: startY, z: z + 0.5 },
            direction: dir,
            maxDistance: MAX_DIST,
          },
        ];
      }
      return [
        {
          name: "Corner 1 (NW)",
          startLocation: { x: x + C_MIN, y: startY, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 2 (NE)",
          startLocation: { x: x + C_MAX, y: startY, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 3 (SW)",
          startLocation: { x: x + C_MIN, y: startY, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 4 (SE)",
          startLocation: { x: x + C_MAX, y: startY, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
      ];
    }
    case Direction.Down: {
      const dir: Vector3 = { x: 0, y: 1, z: 0 };
      const startY = y - OFFSET;
      if (!isCornerMode) {
        return [
          {
            name: "Center",
            startLocation: { x: x + 0.5, y: startY, z: z + 0.5 },
            direction: dir,
            maxDistance: MAX_DIST,
          },
        ];
      }
      return [
        {
          name: "Corner 1 (NW)",
          startLocation: { x: x + C_MIN, y: startY, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 2 (NE)",
          startLocation: { x: x + C_MAX, y: startY, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 3 (SW)",
          startLocation: { x: x + C_MIN, y: startY, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 4 (SE)",
          startLocation: { x: x + C_MAX, y: startY, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
      ];
    }
    case Direction.North: {
      const dir: Vector3 = { x: 0, y: 0, z: 1 };
      const startZ = z - OFFSET;
      if (!isCornerMode) {
        return [
          {
            name: "Center",
            startLocation: { x: x + 0.5, y: y + 0.5, z: startZ },
            direction: dir,
            maxDistance: MAX_DIST,
          },
        ];
      }
      return [
        {
          name: "Corner 1 (BottomLeft)",
          startLocation: { x: x + C_MIN, y: y + C_MIN, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 2 (BottomRight)",
          startLocation: { x: x + C_MAX, y: y + C_MIN, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 3 (TopLeft)",
          startLocation: { x: x + C_MIN, y: y + C_MAX, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 4 (TopRight)",
          startLocation: { x: x + C_MAX, y: y + C_MAX, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
      ];
    }
    case Direction.South: {
      const dir: Vector3 = { x: 0, y: 0, z: -1 };
      const startZ = z + 1.0 + OFFSET;
      if (!isCornerMode) {
        return [
          {
            name: "Center",
            startLocation: { x: x + 0.5, y: y + 0.5, z: startZ },
            direction: dir,
            maxDistance: MAX_DIST,
          },
        ];
      }
      return [
        {
          name: "Corner 1 (BottomLeft)",
          startLocation: { x: x + C_MIN, y: y + C_MIN, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 2 (BottomRight)",
          startLocation: { x: x + C_MAX, y: y + C_MIN, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 3 (TopLeft)",
          startLocation: { x: x + C_MIN, y: y + C_MAX, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 4 (TopRight)",
          startLocation: { x: x + C_MAX, y: y + C_MAX, z: startZ },
          direction: dir,
          maxDistance: MAX_DIST,
        },
      ];
    }
    case Direction.West: {
      const dir: Vector3 = { x: 1, y: 0, z: 0 };
      const startX = x - OFFSET;
      if (!isCornerMode) {
        return [
          {
            name: "Center",
            startLocation: { x: startX, y: y + 0.5, z: z + 0.5 },
            direction: dir,
            maxDistance: MAX_DIST,
          },
        ];
      }
      return [
        {
          name: "Corner 1 (BottomNorth)",
          startLocation: { x: startX, y: y + C_MIN, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 2 (BottomSouth)",
          startLocation: { x: startX, y: y + C_MIN, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 3 (TopNorth)",
          startLocation: { x: startX, y: y + C_MAX, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 4 (TopSouth)",
          startLocation: { x: startX, y: y + C_MAX, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
      ];
    }
    case Direction.East: {
      const dir: Vector3 = { x: -1, y: 0, z: 0 };
      const startX = x + 1.0 + OFFSET;
      if (!isCornerMode) {
        return [
          {
            name: "Center",
            startLocation: { x: startX, y: y + 0.5, z: z + 0.5 },
            direction: dir,
            maxDistance: MAX_DIST,
          },
        ];
      }
      return [
        {
          name: "Corner 1 (BottomNorth)",
          startLocation: { x: startX, y: y + C_MIN, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 2 (BottomSouth)",
          startLocation: { x: startX, y: y + C_MIN, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 3 (TopNorth)",
          startLocation: { x: startX, y: y + C_MAX, z: z + C_MIN },
          direction: dir,
          maxDistance: MAX_DIST,
        },
        {
          name: "Corner 4 (TopSouth)",
          startLocation: { x: startX, y: y + C_MAX, z: z + C_MAX },
          direction: dir,
          maxDistance: MAX_DIST,
        },
      ];
    }
    default:
      return [];
  }
}

/**
 * 殴打面（指定面）の外側からレイキャストを照射して当たり判定を検証する。
 * （MCPE-223452 による hit.faceLocation の方角依存ズレを完全に回避）
 *
 * @param block 判定対象のブロック
 * @param face 照射する面（hitFace）
 * @returns 当たり判定があれば true、通り抜けられるなら false
 */
export function hasBlockCollisionFromFace(
  block: Block | undefined,
  face: Direction,
): boolean {
  if (!block || block.isAir || block.isLiquid) {
    return false;
  }

  const adjacentBlock = getAdjacentBlock(block, face);
  const isAdjacentAir = adjacentBlock ? adjacentBlock.isAir : true;
  const isCornerMode = !isAdjacentAir;

  const rayDefs = getFaceRayDefinitions(block, face, isCornerMode);
  const { x, y, z } = block.location;

  const options: BlockRaycastOptions = {
    maxDistance: 1.1,
    includePassableBlocks: false, // 草・花・松明などのすり抜け可能ブロックは除外
    includeLiquidBlocks: false, // 水や溶岩も除外
  };

  for (const ray of rayDefs) {
    const hit = block.dimension.getBlockFromRay(
      ray.startLocation,
      ray.direction,
      options,
    );

    if (
      hit !== undefined &&
      hit.block.location.x === x &&
      hit.block.location.y === y &&
      hit.block.location.z === z
    ) {
      return true;
    }
  }

  return false;
}
