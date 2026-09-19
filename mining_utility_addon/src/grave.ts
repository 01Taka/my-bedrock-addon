import {
  world,
  system,
  EquipmentSlot,
  EntityComponentTypes,
  BlockComponentTypes,
  EntityInventoryComponent,
  EntityEquippableComponent,
  BlockInventoryComponent,
  ItemStack,
  Vector3,
  EntityDieAfterEvent,
  PlayerInteractWithBlockBeforeEvent,
  PlayerBreakBlockBeforeEvent,
  Player,
  Block,
  Dimension,
} from "@minecraft/server";
import { isSettingEnabled, SETTING_KEYS } from "./settings";

function isLava(block: Block | undefined): boolean {
  if (!block) return false;
  return (
    block.typeId === "minecraft:lava" ||
    block.typeId === "minecraft:flowing_lava"
  );
}

/**
 * アイテムを内部に保持するブロックIDの一覧
 */
const CONTAINER_BLOCK_IDS = new Set<string>([
  "minecraft:chest",
  "minecraft:trapped_chest",
  "minecraft:barrel",
  "minecraft:dispenser",
  "minecraft:dropper",
  "minecraft:hopper",
  "minecraft:crafter",
  "minecraft:furnace",
  "minecraft:lit_furnace",
  "minecraft:blast_furnace",
  "minecraft:lit_blast_furnace",
  "minecraft:smoker",
  "minecraft:lit_smoker",
  "minecraft:brewing_stand",
  "minecraft:ender_chest",
  "minecraft:chiseled_bookshelf",
  "minecraft:decorated_pot",
  "minecraft:jukebox",
  "minecraft:lectern",
  "minecraft:campfire",
  "minecraft:soul_campfire",
  // シュルカーボックス各種
  "minecraft:shulker_box",
  "minecraft:undyed_shulker_box",
  "minecraft:white_shulker_box",
  "minecraft:orange_shulker_box",
  "minecraft:magenta_shulker_box",
  "minecraft:light_blue_shulker_box",
  "minecraft:yellow_shulker_box",
  "minecraft:lime_shulker_box",
  "minecraft:pink_shulker_box",
  "minecraft:gray_shulker_box",
  "minecraft:light_gray_shulker_box",
  "minecraft:cyan_shulker_box",
  "minecraft:purple_shulker_box",
  "minecraft:blue_shulker_box",
  "minecraft:brown_shulker_box",
  "minecraft:green_shulker_box",
  "minecraft:red_shulker_box",
  "minecraft:black_shulker_box",
]);

/**
 * ブロックがアイテムを内部に保持するタイプかどうかを判定
 */
function isContainerBlock(block: Block | undefined): boolean {
  if (!block) return false;
  if (CONTAINER_BLOCK_IDS.has(block.typeId)) return true;
  if (block.typeId.includes("shulker_box")) return true;
  try {
    if (block.getComponent(BlockComponentTypes.Inventory)) return true;
  } catch (e) {}
  return false;
}

const SURROUNDING_8_OFFSETS: [number, number][] = [
  [0, 1],   // 南
  [0, -1],  // 北
  [1, 0],   // 東
  [-1, 0],  // 西
  [1, 1],   // 南東
  [-1, 1],  // 南西
  [1, -1],  // 北東
  [-1, -1], // 北西
];

/**
 * アイテム保持ブロックを上書きしないように墓石の設置ブロックを探索・解決する
 */
function resolveSafeGraveBlock(
  dimension: Dimension,
  initialPos: Vector3,
): Block | undefined {
  let currX = initialPos.x;
  let currY = initialPos.y;
  let currZ = initialPos.z;

  while (currY <= dimension.heightRange.max) {
    const candidateBlock = dimension.getBlock({ x: currX, y: currY, z: currZ });
    if (!candidateBlock) {
      currY++;
      continue;
    }

    // アイテム保持ブロックでない場合は、このブロックを採用
    if (!isContainerBlock(candidateBlock)) {
      return candidateBlock;
    }

    // アイテム保持ブロックの場合：生成予定位置のy座標が同じ周囲8マスに空気があればそこに設置
    let foundAirBlock: Block | undefined;
    for (const [dx, dz] of SURROUNDING_8_OFFSETS) {
      const neighbor = dimension.getBlock({
        x: currX + dx,
        y: currY,
        z: currZ + dz,
      });
      if (neighbor && neighbor.isAir) {
        foundAirBlock = neighbor;
        break;
      }
    }

    if (foundAirBlock) {
      return foundAirBlock;
    }

    // なければ上の座標に墓を生成しようとする（その位置もアイテムを保持するブロックの場合同じ手順）
    currY++;
  }

  return dimension.getBlock(initialPos);
}

interface GraveData {
  ownerId: string;
  ownerName: string;
  dimensionId?: string;
  allowOthers?: boolean;
  hideX: number;
  hideY: number;
  hideZ: number;
  origType1: string;
  origType2: string;
  origGroundType: string;
}

export type RecoveryCompassMode = 1 | 2 | 3;
export const RECOVERY_COMPASS_SETTING_KEY = "setting_recovery_compass";

let cachedRecoveryCompassMode: RecoveryCompassMode | undefined;

/**
 * リカバリーコンパスの設定値を取得（ワールド共通、デフォルトは 1: lost）
 */
export function getRecoveryCompassMode(): RecoveryCompassMode {
  try {
    const val = world.getDynamicProperty(RECOVERY_COMPASS_SETTING_KEY);
    if (typeof val === "number" && (val === 1 || val === 2 || val === 3)) {
      cachedRecoveryCompassMode = val;
      return val;
    }
  } catch (e) {}

  if (cachedRecoveryCompassMode !== undefined) {
    return cachedRecoveryCompassMode;
  }
  return 1;
}

/**
 * リカバリーコンパスの設定値を保存（ワールド共通）
 */
export function setRecoveryCompassMode(mode: RecoveryCompassMode): void {
  cachedRecoveryCompassMode = mode;
  try {
    world.setDynamicProperty(RECOVERY_COMPASS_SETTING_KEY, mode);
  } catch (e) {
    console.error("リカバリーコンパス設定保存エラー:", e);
  }
}

/**
 * リカバリーコンパス設定の説明テキストを取得
 */
export function getRecoveryCompassModeDescription(mode: RecoveryCompassMode): string {
  switch (mode) {
    case 1:
      return "lost (墓の中に含める・デフォルト)";
    case 2:
      return "keep (インベントリ内にキープ)";
    case 3:
      return "give (キープ＋未所持なら自動付与)";
  }
}

const pendingCompassGrantPlayerIds = new Set<string>();
const recoveringGraveKeys = new Set<string>();

/**
 * プレイヤーがリカバリーコンパスを持っていなければインベントリに付与
 */
export function giveRecoveryCompassIfMissing(player: Player): boolean {
  try {
    const invComp = player.getComponent(EntityComponentTypes.Inventory) as
      | EntityInventoryComponent
      | undefined;
    const inv = invComp?.container;
    if (!inv) return false;

    // 既にインベントリ内にリカバリーコンパスがあるか確認
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === "minecraft:recovery_compass") {
        return false;
      }
    }
    // オフハンドの確認
    const equippable = player.getComponent(EntityComponentTypes.Equippable) as
      | EntityEquippableComponent
      | undefined;
    if (equippable) {
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
      if (offhand && offhand.typeId === "minecraft:recovery_compass") {
        return false;
      }
    }

    inv.addItem(new ItemStack("minecraft:recovery_compass", 1));
    return true;
  } catch (e) {
    console.error("リカバリーコンパス付与エラー:", e);
    return false;
  }
}

/**
 * プレイヤーリスポーン時のリカバリーコンパス補給ハンドラー
 */
export function handleGravePlayerSpawn(player: Player): void {
  const compassMode = getRecoveryCompassMode();
  if (compassMode === 3 && pendingCompassGrantPlayerIds.has(player.id)) {
    pendingCompassGrantPlayerIds.delete(player.id);
    system.run(() => {
      if (giveRecoveryCompassIfMissing(player)) {
        player.sendMessage("§a[墓] 死亡地点を示すリカバリーコンパスを付与しました。");
      }
    });
  }
}

/**
 * プレイヤー死亡時の墓生成ハンドラー
 */
export function handleGraveEntityDie(event: EntityDieAfterEvent): void {
  const deadEntity = event.deadEntity;
  if (!(deadEntity instanceof Player)) return;

  const player = deadEntity;

  // 墓機能がOFFの場合は墓コードを完全に停止（バニラのkeepInventory=falseに任せる）
  if (!isSettingEnabled(player, SETTING_KEYS.GRAVE)) {
    return;
  }

  const dimension = player.dimension;
  const playerName = player.nameTag || player.id || "Player";
  const playerId = player.id;

  const isVoidDeath = player.location.y < dimension.heightRange.min;
  const basePos: Vector3 = {
    x: Math.floor(player.location.x),
    y: Math.max(Math.floor(player.location.y), dimension.heightRange.min),
    z: Math.floor(player.location.z),
  };

  const compassMode = getRecoveryCompassMode();
  let hasRecoveryCompass = false;

  const items: ItemStack[] = [];

  // 1. 通常インベントリからアイテムをコピー（インベントリからはまだ削除しない）
  const invComp = player.getComponent(EntityComponentTypes.Inventory) as
    | EntityInventoryComponent
    | undefined;
  const inv = invComp?.container;
  if (inv) {
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) {
        if (item.typeId === "minecraft:recovery_compass") {
          hasRecoveryCompass = true;
          if (compassMode === 2 || compassMode === 3) {
            // モード2または3では墓チェストへ含めずインベントリにキープ
            continue;
          }
        }
        items.push(item.clone());
      }
    }
  }

  // 2. 装備・オフハンドからアイテムをコピー（まだ削除しない）
  const equippable = player.getComponent(EntityComponentTypes.Equippable) as
    | EntityEquippableComponent
    | undefined;
  const slots: EquipmentSlot[] = [
    EquipmentSlot.Head,
    EquipmentSlot.Chest,
    EquipmentSlot.Legs,
    EquipmentSlot.Feet,
    EquipmentSlot.Offhand,
  ];
  if (equippable) {
    for (const slot of slots) {
      const item = equippable.getEquipment(slot);
      if (item) {
        if (item.typeId === "minecraft:recovery_compass") {
          hasRecoveryCompass = true;
          if (compassMode === 2 || compassMode === 3) {
            // モード2または3では墓チェストへ含めずインベントリ/装備にキープ
            continue;
          }
        }
        items.push(item.clone());
      }
    }
  }

  // モード3でコンパス未所持の場合、リスポーン時または死亡時に付与する対象として登録
  if (compassMode === 3 && !hasRecoveryCompass) {
    pendingCompassGrantPlayerIds.add(playerId);
  }

  if (items.length === 0) {
    if (compassMode === 3 && !hasRecoveryCompass) {
      system.run(() => {
        giveRecoveryCompassIfMissing(player);
      });
    }
    return;
  }

  system.run(() => {
    try {
      // 1. 墓石の初期配置候補位置の選定
      let initialGravePos: Vector3;

      const groundBlock0 = dimension.getBlock(basePos);
      const groundBlock1 = dimension.getBlock({
        x: basePos.x,
        y: Math.min(basePos.y + 1, dimension.heightRange.max),
        z: basePos.z,
      });

      if (isVoidDeath) {
        // 奈落で死亡した場合は、奈落(ブロックが置けない位置)から2マス上（min + 1）に生成
        initialGravePos = {
          x: basePos.x,
          y: dimension.heightRange.min + 1,
          z: basePos.z,
        };
      } else if (isLava(groundBlock0) || isLava(groundBlock1)) {
        // 溶岩の中で死亡した場合の判定（足元または頭部が溶岩）
        let lavaTopY = isLava(groundBlock1)
          ? Math.min(basePos.y + 1, dimension.heightRange.max)
          : basePos.y;

        // 溶岩がなくなるまで上方向へ探索（表面の溶岩ブロックを特定）
        while (lavaTopY < dimension.heightRange.max) {
          const nextBlock = dimension.getBlock({
            x: basePos.x,
            y: lavaTopY + 1,
            z: basePos.z,
          });
          if (isLava(nextBlock)) {
            lavaTopY++;
          } else {
            break;
          }
        }

        const y1 = Math.min(lavaTopY + 1, dimension.heightRange.max);
        const y2 = Math.min(lavaTopY + 2, dimension.heightRange.max);

        const block1 = dimension.getBlock({
          x: basePos.x,
          y: y1,
          z: basePos.z,
        });
        const block2 = dimension.getBlock({
          x: basePos.x,
          y: y2,
          z: basePos.z,
        });

        // 溶岩がなくなってから2マス空気があれば2マス目に生成（溶岩表面上2マス目）
        if (y2 > y1 && block1 && block1.isAir && block2 && block2.isAir) {
          initialGravePos = { x: basePos.x, y: y2, z: basePos.z };
        } else {
          // 溶岩表面にブロックがある場合や空気層が一マスしかない場合、そのブロックを置き換えて溶岩表面上1マス目に生成
          initialGravePos = { x: basePos.x, y: y1, z: basePos.z };
        }
      } else {
        if (groundBlock0 && groundBlock0.isAir) {
          initialGravePos = groundBlock0.location;
        } else if (groundBlock1 && groundBlock1.isAir) {
          initialGravePos = groundBlock1.location;
        } else {
          initialGravePos = basePos;
        }
      }

      // アイテム保持ブロックを上書きしないよう安全な墓石設置ブロックを解決
      const targetGraveBlock =
        resolveSafeGraveBlock(dimension, initialGravePos) ||
        dimension.getBlock(initialGravePos);
      if (!targetGraveBlock) return;

      const finalPos = targetGraveBlock.location;
      const origGroundType = targetGraveBlock.isAir
        ? "minecraft:air"
        : targetGraveBlock.typeId;

      // 2. 地下の空きY座標を探索（2ブロック分の空きを探す、墓石座標との重複およびコンテナブロックの上書きを回避）
      let targetMinY = dimension.heightRange.min + 1;
      while (targetMinY < dimension.heightRange.min + 50) {
        // 墓石の配置座標と重複するY座標はスキップ
        const isConflictWithGrave =
          (finalPos.x === basePos.x && finalPos.y === targetMinY && finalPos.z === basePos.z) ||
          (finalPos.x === basePos.x + 1 && finalPos.y === targetMinY && finalPos.z === basePos.z);

        if (isConflictWithGrave) {
          targetMinY++;
          continue;
        }

        const b1 = dimension.getBlock({
          x: basePos.x,
          y: targetMinY,
          z: basePos.z,
        });
        const b2 = dimension.getBlock({
          x: basePos.x + 1,
          y: targetMinY,
          z: basePos.z,
        });
        if (
          b1 &&
          b2 &&
          !isContainerBlock(b1) &&
          !isContainerBlock(b2)
        ) {
          break;
        }
        targetMinY++;
      }

      const hidePos1: Vector3 = { x: basePos.x, y: targetMinY, z: basePos.z };
      const hidePos2: Vector3 = {
        x: basePos.x + 1,
        y: targetMinY,
        z: basePos.z,
      };

      const hideBlock1 = dimension.getBlock(hidePos1);
      const hideBlock2 = dimension.getBlock(hidePos2);
      if (!hideBlock1 || !hideBlock2) return;

      const origType1 = hideBlock1.typeId;
      const origType2 = hideBlock2.typeId;

      // 樽（Barrel）を使用: 27スロット×2＝54スロット確保でき、隣接しても絶対に結合事故が起きない
      hideBlock1.setType("minecraft:barrel");
      hideBlock2.setType("minecraft:barrel");

      const c1Comp = hideBlock1.getComponent(BlockComponentTypes.Inventory) as
        | BlockInventoryComponent
        | undefined;
      const c2Comp = hideBlock2.getComponent(BlockComponentTypes.Inventory) as
        | BlockInventoryComponent
        | undefined;
      const c1 = c1Comp?.container;
      const c2 = c2Comp?.container;

      // 3. チェストに全アイテムをコピー
      let itemIdx = 0;
      if (c1) {
        for (let i = 0; i < c1.size && itemIdx < items.length; i++) {
          c1.setItem(i, items[itemIdx++]);
        }
      }
      if (c2 && itemIdx < items.length) {
        for (let i = 0; i < c2.size && itemIdx < items.length; i++) {
          c2.setItem(i, items[itemIdx++]);
        }
      }

      // 4. コピー完了後、インベントリおよび装備からアイテムを一斉に削除
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item) {
            if (
              (compassMode === 2 || compassMode === 3) &&
              item.typeId === "minecraft:recovery_compass"
            ) {
              // モード2または3ではリカバリーコンパスをインベントリ内にキープ
              continue;
            }
            inv.setItem(i, undefined);
          }
        }
      }
      if (equippable) {
        for (const slot of slots) {
          const item = equippable.getEquipment(slot);
          if (item) {
            if (
              (compassMode === 2 || compassMode === 3) &&
              item.typeId === "minecraft:recovery_compass"
            ) {
              // モード2または3ではリカバリーコンパスを装備/オフハンドにキープ
              continue;
            }
            equippable.setEquipment(slot, undefined);
          }
        }
      }

      // 5. モード3かつ死亡時にコンパスを持っていなかった場合はインベントリに新規付与
      if (compassMode === 3 && !hasRecoveryCompass) {
        giveRecoveryCompassIfMissing(player);
      }

      // 6. 墓石の設置とデータ保存
      targetGraveBlock.setType("minecraft:bedrock");

      const graveKey = `grave_${finalPos.x}_${finalPos.y}_${finalPos.z}`;
      const graveData: GraveData = {
        ownerId: playerId,
        ownerName: playerName,
        dimensionId: dimension.id,
        allowOthers: isSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS),
        hideX: hidePos1.x,
        hideY: targetMinY,
        hideZ: hidePos1.z,
        origType1: origType1,
        origType2: origType2,
        origGroundType: origGroundType,
      };

      world.setDynamicProperty(graveKey, JSON.stringify(graveData));

      world.sendMessage(
        `§c${playerName} の墓が生成されました [X: ${finalPos.x}, Y: ${finalPos.y}, Z: ${finalPos.z}]`,
      );
    } catch (e) {
      console.error("墓生成エラー: " + e);
    }
  });
}

/**
 * 墓の右クリック回収ハンドラー
 */
export function handleGraveBeforeInteract(
  event: PlayerInteractWithBlockBeforeEvent,
): void {
  const block = event.block;
  const player = event.player;
  const dimension = block.dimension;
  const graveKey = `grave_${block.location.x}_${block.location.y}_${block.location.z}`;

  // 既に回収処理が進行中の場合は即座に遮断（同一tick連打や複数人回収によるアイテム増殖防止）
  if (recoveringGraveKeys.has(graveKey)) {
    event.cancel = true;
    return;
  }

  const rawData = world.getDynamicProperty(graveKey);
  if (typeof rawData !== "string") return;

  event.cancel = true;

  const data: GraveData = JSON.parse(rawData);

  if (data.ownerId !== player.id) {
    const ownerAllows = data.allowOthers !== false;
    const playerAllows = isSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS);

    if (!ownerAllows || !playerAllows) {
      player.sendMessage(
        `§cこれは ${data.ownerName} の墓です！（他人の墓の回収は無効化されています）`,
      );
      return;
    }
  }

  // 回収ロックを取得
  recoveringGraveKeys.add(graveKey);

  system.run(() => {
    try {
      const hideBlock1 = dimension.getBlock({
        x: data.hideX,
        y: data.hideY,
        z: data.hideZ,
      });
      const hideBlock2 = dimension.getBlock({
        x: data.hideX + 1,
        y: data.hideY,
        z: data.hideZ,
      });

      for (const hideBlock of [hideBlock1, hideBlock2]) {
        if (hideBlock) {
          const comp = hideBlock.getComponent(BlockComponentTypes.Inventory) as
            | BlockInventoryComponent
            | undefined;
          const container = comp?.container;
          if (container) {
            for (let i = 0; i < container.size; i++) {
              const item = container.getItem(i);
              if (item) {
                dimension.spawnItem(item, {
                  x: block.location.x + 0.5,
                  y: block.location.y + 1.0,
                  z: block.location.z + 0.5,
                });
                container.setItem(i, undefined);
              }
            }
          }
        }
      }

      // 地下の保管コンテナ（樽）を復元
      if (hideBlock1) hideBlock1.setType(data.origType1);
      if (hideBlock2) hideBlock2.setType(data.origType2);

      // 墓石を復元
      block.setType(data.origGroundType || "minecraft:air");

      // 墓データを消去
      world.setDynamicProperty(graveKey, undefined);

      if (data.ownerId !== player.id) {
        player.sendMessage(
          `§a${data.ownerName} の墓からすべてのアイテムを回収しました！`,
        );
      } else {
        player.sendMessage(`§a墓からすべてのアイテムを回収しました！`);
      }
    } catch (e) {
      console.error("墓回収エラー: " + e);
    } finally {
      // 処理完了後にロック解除
      recoveringGraveKeys.delete(graveKey);
    }
  });
}

/**
 * クリエイティブでの破壊防止ハンドラー
 */
export function handleGraveBeforeBreak(
  event: PlayerBreakBlockBeforeEvent,
): void {
  const block = event.block;
  const graveKey = `grave_${block.location.x}_${block.location.y}_${block.location.z}`;

  const rawData = world.getDynamicProperty(graveKey);
  if (typeof rawData === "string") {
    event.cancel = true;
    event.player.sendMessage(
      `§e墓石は壊せません。右クリックで回収してください。`,
    );
  }
}
