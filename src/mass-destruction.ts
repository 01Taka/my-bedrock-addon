import { Vector3Utils } from "@minecraft/math";
import {
  Block,
  Dimension,
  EnchantmentType,
  EntityEquippableComponent,
  EquipmentSlot,
  GameMode,
  ItemComponentTypes,
  ItemDurabilityComponent,
  ItemStack,
  Player,
  PlayerBreakBlockAfterEvent,
  Vector3,
} from "@minecraft/server";
import { getMainHandItemInfo } from "./utils";
import { isSettingEnabled, SETTING_KEYS } from "./settings";

// 設定オブジェクト
const config = {
  maxLog: 150, // 原木の破壊上限
  maxLeaves: 1000, // 葉っぱの破壊上限
  leafRadius: 4, // 葉っぱの破壊半径
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

/**
 * マインクラフト統合版 つるはしで採掘可能な鉱石ブロックID一覧
 */
export const ORE_BLOCK_IDS: ReadonlySet<string> = new Set([
  // --- オーバーワールド（石系） ---
  "minecraft:coal_ore",
  "minecraft:copper_ore",
  "minecraft:iron_ore",
  "minecraft:lapis_ore",
  "minecraft:gold_ore",
  "minecraft:redstone_ore",
  "minecraft:lit_redstone_ore", // 点灯状態
  "minecraft:diamond_ore",
  "minecraft:emerald_ore",

  // --- オーバーワールド（深層岩系） ---
  "minecraft:deepslate_coal_ore",
  "minecraft:deepslate_copper_ore",
  "minecraft:deepslate_iron_ore",
  "minecraft:deepslate_lapis_ore",
  "minecraft:deepslate_gold_ore",
  "minecraft:deepslate_redstone_ore",
  "minecraft:lit_deepslate_redstone_ore", // 点灯状態
  "minecraft:deepslate_diamond_ore",
  "minecraft:deepslate_emerald_ore",

  // --- ネザー ---
  "minecraft:nether_gold_ore",
  "minecraft:quartz_ore",
  "minecraft:gilded_blackstone",
  "minecraft:ancient_debris",

  // --- 関連ブロック（生鉱石・アメジスト） ---
  "minecraft:amethyst_cluster",
  "minecraft:raw_iron_block",
  "minecraft:raw_copper_block",
  "minecraft:raw_gold_block",
]);

interface Zone {
  min: Vector3;
  max: Vector3;
}

function expandZone(
  zone: Zone | null,
  position: Vector3,
  radius: number,
): Zone {
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
  const result: Vector3[] = [];
  const shift = [-1, 0, 1];
  for (const x of shift) {
    for (const y of shift) {
      for (const z of shift) {
        if (x === 0 && y === 0 && z === 0) continue;
        result.push(Vector3Utils.add(position, { x, y, z }));
      }
    }
  }
  return result;
}

function vector3ToString(vector: Vector3) {
  return `${vector.x}_${vector.y}_${vector.z}`;
}

/**
 * 連結しているブロック座標を探索して取得する
 * @param dimension 対象ディメンション
 * @param startPositions 探索開始座標の配列
 * @param predicate 破壊・連結対象とするか判定するコールバック（trueなら対象として採用し周囲も探索）
 * @param options 上限数や探索済みSet
 */
function getConnectedPositions(
  dimension: Dimension,
  startPositions: Vector3[],
  predicate: (block: Block) => boolean,
  options?: {
    maxCount?: number;
    searchedSet?: Set<string>;
  },
) {
  const maxCount = options?.maxCount ?? 1000;
  const searchedSet = options?.searchedSet ?? new Set<string>();

  const nextQueue: Vector3[] = startPositions.map((pos) =>
    Vector3Utils.floor(pos),
  );
  nextQueue.forEach((pos) => searchedSet.add(vector3ToString(pos)));

  const matchedPositions: Vector3[] = [];

  while (nextQueue.length > 0 && matchedPositions.length < maxCount) {
    const currentTargets = [...nextQueue];
    nextQueue.length = 0;

    for (const targetPos of currentTargets) {
      const block = dimension.getBlock(targetPos);
      if (!block) continue;

      // 判定処理を外部コールバックに委任
      if (predicate(block)) {
        matchedPositions.push(targetPos);
        if (matchedPositions.length >= maxCount) break;

        for (const aroundPos of getAroundPositions(targetPos)) {
          const key = vector3ToString(aroundPos);
          if (!searchedSet.has(key)) {
            searchedSet.add(key);
            nextQueue.push(aroundPos);
          }
        }
      }
    }
  }

  return {
    connectedPositions: matchedPositions,
    searchedSet: searchedSet,
  };
}

/**
 * 耐久力（Unbreaking）エンチャントを考慮したダメージ期待値を計算して返します。
 *
 * @param unbreakingLevel - 耐久力エンチャントのレベル (0以上の整数)
 * @param [baseDamage=1] - 本来与える基本ダメージ（省略時は 1）
 * @returns 適用すべきダメージ量（四捨五入された整数）
 */
function calculateDurabilityDamage(unbreakingLevel: number, baseDamage = 1) {
  // レベルが0以下（エンチャントなし）の場合は基本ダメージそのまま
  if (unbreakingLevel <= 0) {
    return Math.round(baseDamage);
  }

  // ダメージを受ける確率の期待値: 1 / (レベル + 1)
  const expectedDamage = baseDamage / (unbreakingLevel + 1);

  // 四捨五入して整数を返す
  return Math.round(expectedDamage);
}

/**
 * ブロックの破壊とツールのエンチャント（幸運/シルクタッチ等）を反映したドロップ処理
 */
function destroyBlock(
  dimension: Dimension,
  position: Vector3,
  player?: Player,
) {
  try {
    if (player && player.isValid) {
      // 1. プレイヤーの手持ちツール（メインハンド）のエンチャントを反映してドロップ生成
      player.runCommand(
        `loot spawn ${position.x} ${position.y} ${position.z} mine ${position.x} ${position.y} ${position.z} mainhand`,
      );
      // 2. ブロックを消去
      dimension.runCommand(
        `setblock ${position.x} ${position.y} ${position.z} air`,
      );
    } else {
      // プレイヤーが無効な場合のフォールバック（通常破壊）
      dimension.runCommand(
        `setblock ${position.x} ${position.y} ${position.z} air destroy`,
      );
    }
  } catch (e) {}
}

export function oreMassDestruction(
  event: PlayerBreakBlockAfterEvent,
  breakableBlockIdSet: ReadonlySet<string>,
) {
  const player = event.player;
  if (!isSettingEnabled(player, SETTING_KEYS.ORE)) return;

  const blockId = event.brokenBlockPermutation.type.id;
  if (!breakableBlockIdSet.has(blockId)) return;

  if (player.isSneaking) return;

  const info = getMainHandItemInfo(player);
  if (!info) return;
  const { equippable, mainhandItem, durability, enchant } = info;

  if (!durability || !mainhandItem.typeId.endsWith("_pickaxe")) return;

  const remainingDurability = durability.maxDurability - durability.damage;
  if (remainingDurability <= 1) return;

  const { connectedPositions: destroyPositions } = getConnectedPositions(
    player.dimension,
    getAroundPositions(event.block.location),
    (block) => {
      return blockId === block.typeId;
    },
    { maxCount: 100 },
  );

  for (const position of destroyPositions) {
    destroyBlock(event.dimension, position, player);
  }

  if (player.getGameMode() !== GameMode.Creative) {
    durability.damage = Math.min(
      durability.maxDurability,
      calculateDurabilityDamage(
        enchant.unbreaking,
        durability.damage + destroyPositions.length,
      ),
    );
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhandItem);
  }
}

export function treeMassDestruction(event: PlayerBreakBlockAfterEvent) {
  const player = event.player;
  if (!isSettingEnabled(player, SETTING_KEYS.TREE)) return;

  const blockId = event.brokenBlockPermutation.type.id;
  if (!(blockId in LOG_TO_LEAVES)) return;

  if (player.isSneaking) return;

  const info = getMainHandItemInfo(player);
  if (!info) return;
  const { equippable, mainhandItem, durability, enchant } = info;

  if (!durability || !mainhandItem.typeId.endsWith("_axe")) return;

  const remainingDurability = durability.maxDurability - durability.damage;
  if (remainingDurability <= 1) return;

  let zone: Zone | null = null;

  const leafId = LOG_TO_LEAVES[blockId as keyof typeof LOG_TO_LEAVES];

  // 1. 原木の探索
  const aroundLeafList: Vector3[] = [];
  const { connectedPositions: treeDestroyPositions, searchedSet } =
    getConnectedPositions(
      player.dimension,
      getAroundPositions(event.block.location),
      (block) => {
        // 原木周囲の葉っぱを収集
        if (block.typeId === leafId) {
          aroundLeafList.push(block.location);
        }
        // 原木であればゾーン拡張＆破壊対象とする
        if (block.typeId === blockId) {
          zone = expandZone(zone, block.location, config.leafRadius);
          return true;
        }
        return false;
      },
      { maxCount: config.maxLog },
    );

  const connectedTreeSet = new Set(
    treeDestroyPositions.map((pos) => vector3ToString(pos)),
  );
  const connectedOtherTreeAround = new Set<string>();

  let somePersistent = false;

  // 2. 葉っぱの探索
  const { connectedPositions: leafDestroyPositions } = getConnectedPositions(
    player.dimension,
    aroundLeafList,
    (block) => {
      // 別の木（破壊対象以外の原木）を検知した場合
      if (
        block.typeId === blockId &&
        !connectedTreeSet.has(vector3ToString(block.location))
      ) {
        connectedOtherTreeAround.add(vector3ToString(block.location));
        getAroundPositions(block.location).forEach((pos) => {
          connectedOtherTreeAround.add(vector3ToString(pos));
        });
      }

      // ゾーン内の葉っぱであれば破壊対象とする
      const inZone = zone ? isInZone(zone, block.location, true) : true;
      if (block.typeId === leafId && inZone) {
        const isPersistent = block.permutation.getState("persistent_bit");
        if (isPersistent === false) {
          somePersistent = true;
        }
        return true;
      }
      return false;
    },
    {
      maxCount: config.maxLeaves,
      searchedSet: searchedSet,
    },
  );

  // 3. 破壊処理
  if (!somePersistent) return;

  const destroyPositions = [
    ...treeDestroyPositions,
    ...leafDestroyPositions.filter(
      (pos) => !connectedOtherTreeAround.has(vector3ToString(pos)),
    ),
  ];
  for (const position of destroyPositions) {
    destroyBlock(event.dimension, position, player);
  }

  if (player.getGameMode() !== GameMode.Creative) {
    durability.damage = Math.min(
      durability.maxDurability,
      calculateDurabilityDamage(
        enchant.unbreaking,
        durability.damage + treeDestroyPositions.length,
      ),
    );
    equippable.setEquipment(EquipmentSlot.Mainhand, mainhandItem);
  }
}
