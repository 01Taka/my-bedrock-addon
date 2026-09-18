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
} from "@minecraft/server";
import { isSettingEnabled, SETTING_KEYS } from "./settings";

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
      // 地下の空きY座標を探索（2ブロック分の空きを探す）
      let targetMinY = dimension.heightRange.min + 1;
      while (targetMinY < dimension.heightRange.min + 50) {
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
          b1.typeId !== "minecraft:barrel" &&
          b1.typeId !== "minecraft:chest" &&
          b2.typeId !== "minecraft:barrel" &&
          b2.typeId !== "minecraft:chest"
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

      // 1. チェストに全アイテムをコピー
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

      // 2. コピー完了後、インベントリおよび装備からアイテムを一斉に削除
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

      // 3. モード3かつ死亡時にコンパスを持っていなかった場合はインベントリに新規付与
      if (compassMode === 3 && !hasRecoveryCompass) {
        giveRecoveryCompassIfMissing(player);
      }

      // 3. 墓石の設置位置の判定
      let targetGraveBlock = dimension.getBlock(basePos);
      let origGroundType = "minecraft:air";

      const groundBlock0 = dimension.getBlock(basePos);
      const groundBlock1 = dimension.getBlock({
        x: basePos.x,
        y: Math.min(basePos.y + 1, dimension.heightRange.max),
        z: basePos.z,
      });

      if (groundBlock0 && groundBlock0.isAir) {
        targetGraveBlock = groundBlock0;
        origGroundType = "minecraft:air";
      } else if (groundBlock1 && groundBlock1.isAir) {
        targetGraveBlock = groundBlock1;
        origGroundType = "minecraft:air";
      } else if (groundBlock0) {
        targetGraveBlock = groundBlock0;
        origGroundType = groundBlock0.typeId;
      }

      if (targetGraveBlock) {
        const finalPos = targetGraveBlock.location;
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
      }
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
