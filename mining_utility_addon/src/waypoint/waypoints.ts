import {
  world,
  system,
  EquipmentSlot,
  Vector3,
} from "@minecraft/server";
import { displayHUDWaypoints, spawnWaypointParticle } from "./waypoint-utils";
import {
  addWaypoint,
  waypointCache,
  loadWaypoints,
  hasWaypointAt,
} from "./store-waypoint";
import { Vector3Utils } from "@minecraft/math";
import {
  BANNER_COLOR_NAMES,
  BANNER_COLOR_RGBS,
  BannerColorName,
} from "./waypoint.types";
import {
  handleCompassVirtualNav,
  updatePlayerVirtualNavHUD,
  clearPlayerVirtualNav,
} from "./virtual-nav";
export * from "./virtual-nav";

const lastPlacedBannerName = new Map<string, string | null>();

// プレイヤーごとの「最後に持っていた旗の色」を保持するマップ
const playerBannerColorCache = new Map<string, BannerColorName>();

export function initWaypoints() {
  // 保存されているウェイポイントを DynamicProperty から復元
  loadWaypoints();

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

      const placedName = lastPlacedBannerName.get(player.id);
      // 名前のない旗はウェイポイントとして登録しない
      if (!placedName) return;

      // 旗の色（未検出の場合は白にフォールバックして登録失敗を防ぐ）
      const placedColor = playerBannerColorCache.get(player.id) ?? "white";

      addWaypoint(
        player.dimension,
        waypointPos,
        placedColor,
        placedName,
      );

      // 全員に共有されたことを通知
      try {
        world.sendMessage(
          `§a[Waypoint] §f${player.name} §aがウェイポイント §f${placedName} §aを設置しました`,
        );
      } catch {}
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

  // ウェイポイント実体位置のパーティクル表示（全プレイヤーに見える）
  system.runInterval(() => {
    for (let waypoint of waypointCache) {
      spawnWaypointParticle({
        dimension: waypoint.dim,
        location: waypoint.pos,
        color: BANNER_COLOR_RGBS[waypoint.color],
        size: 1,
        durationTicks: 11,
      });
    }
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
