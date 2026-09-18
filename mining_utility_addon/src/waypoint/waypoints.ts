import {
  world,
  system,
  EquipmentSlot,
  Vector3,
  ItemStack,
} from "@minecraft/server";
import { displayHUDWaypoints, spawnWaypointParticle } from "./waypoint-utils";
import {
  addWaypoint,
  deleteWaypoint,
  waypointCache,
  loadWaypoints,
  hasWaypointAt,
  getWaypointAt,
} from "./store-waypoint";
import { Vector3Utils } from "@minecraft/math";
import {
  BANNER_COLOR_NAMES,
  BANNER_COLOR_RGBS,
  BannerColorName,
  getWaypointDisplayName,
  getWaypointKey,
} from "./waypoint.types";
import {
  handleCompassVirtualNav,
  handleCompassLeftClick,
  updatePlayerVirtualNavHUD,
  clearPlayerVirtualNav,
} from "./virtual-nav";
import {
  spawnWaypointMarker,
  removeWaypointMarker,
  syncWaypointMarkers,
  correctWaypointMarkerPositions,
} from "./waypoint-marker";
export * from "./virtual-nav";
export * from "./waypoint-marker";

const lastPlacedBannerName = new Map<string, string | null>();

// プレイヤーごとの「最後に持っていた旗の色」を保持するマップ
const playerBannerColorCache = new Map<string, BannerColorName>();

/**
 * アイテムにシルクタッチのエンチャントが付与されているか判定
 */
function hasSilkTouchEnchantment(itemStack: ItemStack | undefined): boolean {
  if (!itemStack) return false;
  try {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return false;
    return enchantable.hasEnchantment("silk_touch");
  } catch {
    return false;
  }
}

export function initWaypoints() {
  // 保存されているウェイポイントを DynamicProperty から復元
  loadWaypoints();

  // ワールド読み込み完了後にネームタグマーカーを初期同期
  system.runTimeout(() => {
    try {
      syncWaypointMarkers();
    } catch {}
  }, 40);

  // 100 tick (5秒) ごとにマーカーエンティティ（ネームタグ）の整合性を定期同期
  system.runInterval(() => {
    try {
      syncWaypointMarkers();
    } catch {}
  }, 100);

  // プレイヤーが手に持っている旗の色をキャッシュ
  system.runInterval(() => {
    for (let player of world.getAllPlayers()) {
      if (!player || !player.isValid) continue;
      const equippable = player.getComponent("minecraft:equippable");
      if (!equippable) continue;
      const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (!mainhandItem || mainhandItem.typeId !== "minecraft:banner") continue;

      for (let [data, colorName] of Object.entries(BANNER_COLOR_NAMES)) {
        const res = player.runCommand(
          `testfor @s [hasitem={item=banner, location=slot.weapon.mainhand, data=${data}}]`,
        );
        if (res.successCount > 0) {
          playerBannerColorCache.set(player.id, colorName);
          break;
        }
      }
    }
  }, 4);

  // 空中でのアイテム使用（コンパス操作・旗の名前キャッシュ）
  world.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return;

    if (itemStack.typeId === "minecraft:compass") {
      handleCompassVirtualNav(player, itemStack, () => {
        event.cancel = true;
      });
      return;
    }

    if (itemStack.typeId === "minecraft:banner") {
      if (itemStack.nameTag !== undefined) {
        lastPlacedBannerName.set(player.id, itemStack.nameTag);
      } else {
        lastPlacedBannerName.set(player.id, null);
      }
    }
  });

  // ブロックに対するアイテム使用・設置（コンパス操作・旗の名前キャッシュ）
  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, itemStack } = event;
    if (!itemStack) return;

    if (itemStack.typeId === "minecraft:compass") {
      handleCompassVirtualNav(player, itemStack, () => {
        event.cancel = true;
      });
      return;
    }

    if (itemStack.typeId === "minecraft:banner") {
      if (itemStack.nameTag !== undefined) {
        lastPlacedBannerName.set(player.id, itemStack.nameTag);
      } else {
        lastPlacedBannerName.set(player.id, null);
      }
    }
  });

  // 腕を振る動作（左クリック）検知: コンパス所持時の非表示（遠隔）および表示・非表示切り替え（近接4m）
  try {
    const afterEvents = world.afterEvents as Record<string, any>;
    if (afterEvents && typeof afterEvents.playerSwingStart?.subscribe === "function") {
      afterEvents.playerSwingStart.subscribe((event: any) => {
        try {
          const { player, heldItemStack } = event;
          if (!heldItemStack || heldItemStack.typeId !== "minecraft:compass") return;
          handleCompassLeftClick(player, heldItemStack);
        } catch (err) {
          console.warn("[Waypoints] playerSwingStart ハンドラー内エラー:", err);
        }
      });
    } else {
      console.warn("[Waypoints] 現在の環境では playerSwingStart は未サポートです。");
    }
  } catch (e) {
    console.warn("[Waypoints] playerSwingStart の登録に失敗しました（スキップ）:", e);
  }

  // playerSwingStart 未サポート環境向けのフォールバック（ブロック左クリック検知）
  try {
    const afterEvents = world.afterEvents as Record<string, any>;
    if (afterEvents && typeof afterEvents.playerStartBreakingBlock?.subscribe === "function") {
      afterEvents.playerStartBreakingBlock.subscribe((event: any) => {
        try {
          const { player, itemStack } = event;
          if (!itemStack || itemStack.typeId !== "minecraft:compass") return;
          handleCompassLeftClick(player, itemStack);
        } catch {}
      });
    }
  } catch {}

  // ブロック設置時（旗の設置検知）
  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;

    if (
      block.typeId === "minecraft:standing_banner" ||
      block.typeId === "minecraft:wall_banner"
    ) {
      const blockPos = Vector3Utils.floor(block.location);
      const waypointPos = Vector3Utils.add(blockPos, {
        x: 0.5,
        y: 0.5,
        z: 0.5,
      });

      // 既にウェイポイントがある同じ座標に旗が置かれても完全に無視する
      if (hasWaypointAt(player.dimension, waypointPos)) {
        return;
      }

      const rawName = lastPlacedBannerName.get(player.id);
      const placedName = rawName && rawName.trim() !== "" ? rawName : null;

      // 名前がなく、かつスニーク（シフト）していない場合はウェイポイントとして登録しない
      if (placedName === null && !player.isSneaking) {
        return;
      }

      // 旗の色（未検出の場合は白にフォールバックして登録失敗を防ぐ）
      const placedColor = playerBannerColorCache.get(player.id) ?? "white";

      const waypoint = addWaypoint(
        player.dimension,
        waypointPos,
        placedColor,
        placedName,
        player.id,
      );

      // ウェイポイント座標にネームタグマーカーエンティティを生成（パーティクルと同期）
      spawnWaypointMarker(player.dimension, waypoint);

      const displayName = getWaypointDisplayName(waypoint);

      // 全員に共有されたことを通知
      try {
        world.sendMessage(
          `§a[Waypoint] §f${player.name} §aがウェイポイント §f${displayName} §aを設置しました`,
        );
      } catch {}

      // 設置完了効果音を再生
      const dim = player.dimension;
      const soundPos = { ...waypointPos };
      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.orb", { pitch: 1.2, volume: 1.0 });
          }
          dim.playSound("random.orb", soundPos, { pitch: 1.2, volume: 1.0 });
        } catch {}
      });
    } else {
      // 旗以外の装飾ブロック（石、金ブロック、木等）がウェイポイント座標に設置された場合、
      // ネームタグマーカーを確実に再スポーン (O(1))
      const bPos = Vector3Utils.floor(block.location);
      const existingWp = getWaypointAt(player.dimension, bPos);
      if (existingWp) {
        spawnWaypointMarker(player.dimension, existingWp);
      }
    }
  });

  // ブロック破壊時（旗の破壊検知: デフォルトでは削除、シルクタッチ時は維持）
  world.afterEvents.playerBreakBlock.subscribe((event) => {
    const { block, brokenBlockPermutation, player, itemStackBeforeBreak } =
      event;
    const blockTypeId = brokenBlockPermutation.type.id;

    if (
      blockTypeId === "minecraft:standing_banner" ||
      blockTypeId === "minecraft:wall_banner"
    ) {
      const blockPos = Vector3Utils.floor(block.location);
      const waypoint = getWaypointAt(player.dimension, blockPos);

      if (waypoint) {
        // 使用したツールにシルクタッチが付与されているか判定
        const usedItem =
          itemStackBeforeBreak ??
          player
            .getComponent("minecraft:equippable")
            ?.getEquipment(EquipmentSlot.Mainhand);

        if (hasSilkTouchEnchantment(usedItem)) {
          // シルクタッチ付きツールの場合はウェイポイントをその場に残す
          return;
        }

        // デフォルト: 旗破壊と同時にウェイポイントを削除
        deleteWaypoint(player.dimension, waypoint.pos);
        const key = getWaypointKey(waypoint);
        removeWaypointMarker(player.dimension, key, waypoint.pos);

        const displayName = getWaypointDisplayName(waypoint);
        try {
          player.sendMessage(`§c[Waypoint] §f${displayName} §cを削除しました`);
          player.playSound("random.break", { pitch: 1.2, volume: 1.0 });
          world.sendMessage(
            `§c[Waypoint] §f${displayName} §cが ${player.name} によって削除されました`,
          );
        } catch {}
      }
    }
  });

  // プレイヤー切断時のメモリクリーンアップ
  world.afterEvents.playerLeave.subscribe((event) => {
    try {
      lastPlacedBannerName.delete(event.playerId);
      playerBannerColorCache.delete(event.playerId);
      clearPlayerVirtualNav(event.playerId);
    } catch {}
  });

  // プレイヤーが1マス上(Y+1)にいる際の一時降下(Y-1)および位置ズレ補正を2tickごとに更新
  system.runInterval(() => {
    try {
      correctWaypointMarkerPositions();
    } catch {}
  }, 2);

  // ウェイポイント実体位置のパーティクル表示（全プレイヤーに見える）
  system.runInterval(() => {
    try {
      for (let waypoint of waypointCache) {
        try {
          const colorRgb =
            BANNER_COLOR_RGBS[waypoint.color] ?? { r: 1, g: 1, b: 1 };
          spawnWaypointParticle({
            dimension: waypoint.dim,
            location: waypoint.pos,
            color: colorRgb,
            size: 1,
            durationTicks: 11,
          });
        } catch {}
      }
    } catch {}
  }, 10);

  // 毎tick更新により、10tickのイージングズームおよび視点追従、各プレイヤー専用ナビゲーションHUDをなめらかに描画
  system.runInterval(() => {
    for (let player of world.getAllPlayers()) {
      try {
        if (!player || !player.isValid) continue;
        updatePlayerVirtualNavHUD(player);
        displayHUDWaypoints(player);
      } catch {}
    }
  }, 1);
}
