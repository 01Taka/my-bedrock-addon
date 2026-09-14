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
  PlayerSpawnAfterEvent,
  Player,
} from "@minecraft/server";
import { isSettingEnabled, SETTING_KEYS } from "./settings";

interface GraveData {
  graveId?: string;
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

interface GraveLocationInfo {
  x: number;
  y: number;
  z: number;
  dimensionId: string;
  graveId?: string;
}

// 墓メモ紙の識別用プレフィックス
const GRAVE_PAPER_PREFIX = "§e墓の座標";

/**
 * プレイヤーID、ディメンションID、座標をもとに一意な墓IDを生成する
 */
export function generateGraveId(
  playerId: string,
  dimensionId: string,
  x: number,
  y: number,
  z: number,
): string {
  return `grave_${playerId}_${dimensionId}_${x}_${y}_${z}`;
}

function getDimensionName(id: string): string {
  switch (id) {
    case "minecraft:overworld":
      return "オーバーワールド";
    case "minecraft:nether":
      return "ネザー";
    case "minecraft:the_end":
      return "ジ・エンド";
    default:
      return id;
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

  const items: ItemStack[] = [];

  // 1. 通常インベントリからアイテムをコピー（墓の座標紙は除外、インベントリからはまだ削除しない）
  const invComp = player.getComponent(EntityComponentTypes.Inventory) as
    | EntityInventoryComponent
    | undefined;
  const inv = invComp?.container;
  if (inv) {
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) {
        const isGravePaper =
          item.typeId === "minecraft:paper" &&
          (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) ||
            item.getDynamicProperty("grave_id") !== undefined);

        if (!isGravePaper) {
          items.push(item.clone());
        }
      }
    }
  }

  // 2. 装備・オフハンドからアイテムをコピー（墓の座標紙は除外、まだ削除しない）
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
        const isGravePaper =
          item.typeId === "minecraft:paper" &&
          (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) ||
            item.getDynamicProperty("grave_id") !== undefined);

        if (!isGravePaper) {
          items.push(item.clone());
        }
      }
    }
  }

  if (items.length === 0) return;

  system.run(() => {
    try {
      // 地下の空きY座標を探索
      let targetMinY = dimension.heightRange.min + 1;
      while (targetMinY < dimension.heightRange.min + 20) {
        const b1 = dimension.getBlock({
          x: basePos.x,
          y: targetMinY,
          z: basePos.z,
        });
        if (b1 && b1.typeId !== "minecraft:chest") {
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

      hideBlock1.setType("minecraft:chest");
      hideBlock2.setType("minecraft:chest");

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

      // 2. コピー完了後、インベントリおよび装備から墓の紙以外のアイテムを一斉に削除
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item) {
            const isGravePaper =
              item.typeId === "minecraft:paper" &&
              (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) ||
                item.getDynamicProperty("grave_id") !== undefined);
            if (!isGravePaper) {
              inv.setItem(i, undefined);
            }
          }
        }
      }
      if (equippable) {
        for (const slot of slots) {
          const item = equippable.getEquipment(slot);
          if (item) {
            const isGravePaper =
              item.typeId === "minecraft:paper" &&
              (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) ||
                item.getDynamicProperty("grave_id") !== undefined);
            if (!isGravePaper) {
              equippable.setEquipment(slot, undefined);
            }
          }
        }
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

        const graveId = generateGraveId(
          playerId,
          dimension.id,
          finalPos.x,
          finalPos.y,
          finalPos.z,
        );
        const graveKey = `grave_${finalPos.x}_${finalPos.y}_${finalPos.z}`;
        const graveData: GraveData = {
          graveId: graveId,
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

        // 最新の墓の座標を記憶
        const locationInfo: GraveLocationInfo = {
          x: finalPos.x,
          y: finalPos.y,
          z: finalPos.z,
          dimensionId: dimension.id,
          graveId: graveId,
        };
        player.setDynamicProperty(
          "latest_grave_pos",
          JSON.stringify(locationInfo),
        );

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
 * 復活時に墓の座標紙をインベントリに渡すハンドラー
 */
export function handleGravePlayerSpawn(event: PlayerSpawnAfterEvent): void {
  if (event.initialSpawn) return;

  const player = event.player;
  const rawData = player.getDynamicProperty("latest_grave_pos");
  if (typeof rawData !== "string") return;

  const info: GraveLocationInfo = JSON.parse(rawData);
  const graveId =
    info.graveId ||
    generateGraveId(player.id, info.dimensionId, info.x, info.y, info.z);

  system.run(() => {
    const invComp = player.getComponent(EntityComponentTypes.Inventory) as
      | EntityInventoryComponent
      | undefined;
    const inv = invComp?.container;

    if (inv) {
      const paper = new ItemStack("minecraft:paper", 1);
      paper.nameTag = `${GRAVE_PAPER_PREFIX} [X: ${info.x}, Y: ${info.y}, Z: ${info.z}]`;
      paper.setDynamicProperty("grave_id", graveId);
      paper.setLore([
        `§7世界: ${getDimensionName(info.dimensionId)}`,
        `§7X: ${info.x}, Y: ${info.y}, Z: ${info.z}`,
        `§a岩盤を右クリックでアイテムを回収`,
      ]);

      inv.addItem(paper);
    }

    player.setDynamicProperty("latest_grave_pos", undefined);
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

      // 地下のチェストを復元
      if (hideBlock1) hideBlock1.setType(data.origType1);
      if (hideBlock2) hideBlock2.setType(data.origType2);

      // 墓石を復元
      block.setType(data.origGroundType || "minecraft:air");

      // 墓データを消去
      world.setDynamicProperty(graveKey, undefined);

      // 対応する墓メモ紙がインベントリまたはオフハンドにあれば削除
      const targetGraveId =
        data.graveId ||
        generateGraveId(
          data.ownerId,
          dimension.id,
          block.location.x,
          block.location.y,
          block.location.z,
        );

      const invComp = player.getComponent(EntityComponentTypes.Inventory) as
        | EntityInventoryComponent
        | undefined;
      const inv = invComp?.container;
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item && item.typeId === "minecraft:paper") {
            const itemGraveId = item.getDynamicProperty("grave_id");
            if (
              itemGraveId === targetGraveId ||
              (!itemGraveId &&
                item.nameTag ===
                  `${GRAVE_PAPER_PREFIX} [X: ${block.location.x}, Y: ${block.location.y}, Z: ${block.location.z}]`)
            ) {
              inv.setItem(i, undefined);
            }
          }
        }
      }

      const equippable = player.getComponent(EntityComponentTypes.Equippable) as
        | EntityEquippableComponent
        | undefined;
      if (equippable) {
        const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);
        if (offhandItem && offhandItem.typeId === "minecraft:paper") {
          const itemGraveId = offhandItem.getDynamicProperty("grave_id");
          if (
            itemGraveId === targetGraveId ||
            (!itemGraveId &&
              offhandItem.nameTag ===
                `${GRAVE_PAPER_PREFIX} [X: ${block.location.x}, Y: ${block.location.y}, Z: ${block.location.z}]`)
          ) {
            equippable.setEquipment(EquipmentSlot.Offhand, undefined);
          }
        }
      }

      if (data.ownerId !== player.id) {
        player.sendMessage(
          `§a${data.ownerName} の墓からすべてのアイテムを回収しました！`,
        );
      } else {
        player.sendMessage(`§a墓からすべてのアイテムを回収しました！`);
      }
    } catch (e) {
      console.error("墓回収エラー: " + e);
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
