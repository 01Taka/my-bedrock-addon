import { Vector3Utils } from "@minecraft/math";
import {
  Block,
  Dimension,
  Player,
  PlayerBreakBlockAfterEvent,
  ScriptEventCommandMessageAfterEvent,
  Vector3,
  system,
  world,
} from "@minecraft/server";

// 設定オブジェクト
const config = {
  maxLog: 150, // 原木の破壊上限
  maxLeaves: 600, // 葉っぱの破壊上限
  lowBorderLog: 7,
  highLeafRadius: 3, // 葉っぱの破壊半径
  lowLeafRadius: 2,
};

const LOG_TO_LEAVES = {
  "minecraft:oak_log": "minecraft:oak_leaves",
  "minecraft:spruce_log": "minecraft:spruce_leaves",
  "minecraft:birch_log": "minecraft:birch_leaves",
  "minecraft:jungle_log": "minecraft:jungle_leaves",
  "minecraft:acacia_log": "minecraft:acacia_leaves",
  "minecraft:dark_oak_log": "minecraft:dark_oak_leaves",
  "minecraft:mangrove_log": "minecraft:mangrove_leaves",
  "minecraft:cherry_log": "minecraft:cherry_leaves",
  "minecraft:pale_oak_log": "minecraft:pale_oak_leaves",
  "minecraft:crimson_stem": "minecraft:nether_wart_block",
  "minecraft:warped_stem": "minecraft:warped_wart_block",
};

interface Zone {
  min: Vector3;
  max: Vector3;
}

function updateZone(zone: Zone | null, position: Vector3, radius: number) {
  if (!zone) {
    return {
      min: {
        x: position.x - radius,
        y: position.y - radius,
        z: position.z - radius,
      },
      max: {
        x: position.x + radius,
        y: position.y + radius,
        z: position.z + radius,
      },
    };
  }

  return {
    min: {
      x: Math.min(zone.min.x, position.x - radius),
      y: Math.min(zone.min.y, position.y - radius),
      z: Math.min(zone.min.z, position.z - radius),
    },
    max: {
      x: Math.max(zone.max.x, position.x + radius),
      y: Math.max(zone.max.y, position.y + radius),
      z: Math.max(zone.max.z, position.z + radius),
    },
  };
}

function isInZone(zone: Zone, position: Vector3, isInfY: boolean) {
  return (
    zone.min.x <= position.x &&
    (zone.min.y <= position.y || isInfY) &&
    zone.min.z <= position.z &&
    zone.max.x >= position.x &&
    (zone.max.y >= position.y || isInfY) &&
    zone.max.z >= position.z
  );
}

function getAroundPositions(position: Vector3) {
  const result = [];
  const shift = [-1, 0, 1];
  for (let x of shift) {
    for (let y of shift) {
      for (let z of shift) {
        if (x === 0 && y === 0 && z === 0) continue;
        result.push(Vector3Utils.add(position, { x, y, z }));
      }
    }
  }
  return result;
}

function vector3Tostring(vector: Vector3) {
  return `${vector.x}_${vector.y}_${vector.z}`;
}

function getConnectedPositions(
  dimension: Dimension,
  blockTypeId: string,
  startPosList: Vector3[],
  options?: {
    maxCount?: number;
    alreadySearchedPosSet?: Set<string>;
    zone?: Zone;
    onVerifyBlock?: (block: Block) => void;
  },
) {
  const startFloorList = startPosList.map((pos) => Vector3Utils.floor(pos));
  const nextSearchTargetPosList: Vector3[] = startFloorList;
  const searchedPosSet = options?.alreadySearchedPosSet ?? new Set<string>();
  startFloorList.forEach((pos) => searchedPosSet.add(vector3Tostring(pos)));

  const findPosList = [];

  while (
    nextSearchTargetPosList.length > 0 &&
    findPosList.length < (options?.maxCount ?? 1000)
  ) {
    const searchTargetPosList = [...nextSearchTargetPosList];
    nextSearchTargetPosList.length = 0;

    for (let targetPos of searchTargetPosList) {
      const targetBlock = dimension.getBlock(targetPos);
      if (!targetBlock) continue;
      options?.onVerifyBlock?.(targetBlock);
      const inZone = options?.zone
        ? isInZone(options.zone, targetPos, true)
        : true;
      if (targetBlock?.typeId === blockTypeId && inZone) {
        findPosList.push(targetPos);
        if (findPosList.length >= (options?.maxCount ?? 1000)) break;
        getAroundPositions(targetPos).forEach((pos) => {
          if (!searchedPosSet.has(vector3Tostring(pos))) {
            searchedPosSet.add(vector3Tostring(pos));
            nextSearchTargetPosList.push(pos);
          }
        });
      }
    }
  }

  return {
    connectedPositions: [...startFloorList, ...findPosList],
    newConnectedPositions: findPosList,
    searchedPosSet: searchedPosSet,
  };
}

function treeMassDestruction(event: PlayerBreakBlockAfterEvent) {
  const player = event.player;
  const blockId = event.brokenBlockPermutation.type.id;
  let lowZone: Zone | null = null;
  let highZone: Zone | null = null;

  if (!(blockId in LOG_TO_LEAVES)) return;
  const leafId = LOG_TO_LEAVES[blockId as keyof typeof LOG_TO_LEAVES];

  const aroundLeafList: Vector3[] = [];
  const { connectedPositions: treeDestroyPositions, searchedPosSet } =
    getConnectedPositions(
      player.dimension,
      blockId,
      getAroundPositions(event.block.location),
      {
        maxCount: config.maxLog,
        onVerifyBlock: (block) => {
          if (block.typeId === leafId) aroundLeafList.push(block.location);
          if (block.typeId === blockId) {
            lowZone = updateZone(lowZone, block.location, config.lowLeafRadius);
            highZone = updateZone(
              highZone,
              block.location,
              config.highLeafRadius,
            );
          }
        },
      },
    );

  const { connectedPositions: leafDestroyPositions } = getConnectedPositions(
    player.dimension,
    leafId,
    aroundLeafList,
    {
      maxCount: config.maxLeaves,
      alreadySearchedPosSet: searchedPosSet,
      zone:
        (treeDestroyPositions.length > config.lowBorderLog
          ? highZone
          : lowZone) ?? undefined,
    },
  );

  player.sendMessage(`葉っぱの破壊数: ${leafDestroyPositions.length}`);

  for (let position of [...treeDestroyPositions, ...leafDestroyPositions]) {
    destroyBlock(event.dimension, position);
  }
}

function destroyBlock(dimension: Dimension, position: Vector3) {
  try {
    dimension.runCommand(
      `setblock ${position.x} ${position.y} ${position.z} air destroy`,
    );
  } catch (e) {}
}

// ==========================================
// 1. /scriptevent による設定変更
// ==========================================
system.afterEvents.scriptEventReceive.subscribe(
  (event: ScriptEventCommandMessageAfterEvent) => {
    const { id, message, sourceEntity } = event;
    const player = sourceEntity instanceof Player ? sourceEntity : undefined;

    const sendMessage = (msg: string) => {
      if (player) {
        player.sendMessage(msg);
      } else {
        world.sendMessage(msg);
      }
    };

    // /scriptevent tree:status
    if (id === "tree:status") {
      sendMessage(
        `§e--- 一括破壊 設定一覧 ---\n` +
          `§b原木破壊上限 (log): §f${config.maxLog}\n` +
          `§b葉っぱ破壊上限 (leaf): §f${config.maxLeaves}\n` +
          `§b小さい木の葉っぱ破壊半径 (lowradius): §f${config.lowLeafRadius}\n` +
          `§b大きい木の葉っぱ破壊半径 (highradius): §f${config.highLeafRadius}\n` +
          `§b小さい木の原木の数の上限 (logborder): §f${config.lowBorderLog}\n` +
          `§7[変更例] /scriptevent tree:set log 100`,
      );
      return;
    }

    // /scriptevent tree:set <log|leaf|radius> <数値>
    if (id === "tree:set") {
      const args = message.trim().split(/\s+/);
      if (args.length < 2) {
        sendMessage(
          "§c[エラー] 使用法: /scriptevent tree:set <log|leaf|lowradius|highradius> <数値>",
        );
        return;
      }

      const subCommand = args[0].toLowerCase();
      const value = parseInt(args[1], 10);

      if (isNaN(value) || value < 1) {
        sendMessage("§c[エラー] 1以上の数値を入力してください。");
        return;
      }

      switch (subCommand) {
        case "log":
          config.maxLog = value;
          sendMessage(`§a原木の破壊上限を §f${value} §aに設定しました。`);
          break;
        case "leaf":
        case "leaves":
          config.maxLeaves = value;
          sendMessage(`§a葉っぱの破壊上限を §f${value} §aに設定しました。`);
          break;
        case "lowradius":
          config.lowLeafRadius = value;
          sendMessage(
            `§a小さい木の葉っぱの破壊半径を §f${value} §aに設定しました。`,
          );
          break;
        case "highradius":
          config.highLeafRadius = value;
          sendMessage(
            `§a大きい木の葉っぱの破壊半径を §f${value} §aに設定しました。`,
          );
          break;
        case "logborder":
          config.lowBorderLog = value;
          sendMessage(
            `§a小さい木の原木の数の上限を §f${value} §aに設定しました。`,
          );
          break;
        default:
          sendMessage(
            "§c[エラー] 対象は log, leaf, radius のいずれかを指定してください。",
          );
          break;
      }
    }
  },
);

// ==========================================
// 2. ブロックを壊したときのイベント
// ==========================================
world.afterEvents.playerBreakBlock.subscribe((event) => {
  treeMassDestruction(event);
});
