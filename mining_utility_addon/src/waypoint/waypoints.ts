import {
  world,
  system,
  EquipmentSlot,
  EntityEquippableComponent,
  Vector3,
  Dimension,
  DimensionType,
  DimensionTypes,
  DimensionLocation,
} from "@minecraft/server";
import { displayHUDWaypoints, spawnWaypointParticle } from "./waypoint-utils";
import { addWaypoint, waypointCache } from "./store-waypoint";
import { Vector3Utils } from "@minecraft/math";
import {
  BANNER_COLOR_NAMES,
  BANNER_COLOR_RGBS,
  BannerColorName,
} from "./waypoint.types";
import { handleCompassVirtualNav, updatePlayerVirtualNavHUD } from "./virtual-nav";
export * from "./virtual-nav";

const lastPlacedBannerName = new Map<string, string | null>();

// プレイヤーごとの「最後に持っていた旗の色」を保持するマップ
const playerBannerColorCache = new Map<string, BannerColorName>();

export function initWaypoints() {
  system.runInterval(() => {
    for (let player of world.getAllPlayers()) {
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

  world.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return;

    if (itemStack.typeId === "minecraft:compass") {
      handleCompassVirtualNav(event, () => {
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

  world.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;

    if (
      block.typeId === "minecraft:standing_banner" ||
      block.typeId === "minecraft:wall_banner"
    ) {
      const placedName = lastPlacedBannerName.get(player.id);
      const placedColor = playerBannerColorCache.get(player.id);

      player.sendMessage(`旗の名前は ${placedName ?? "不明"} です`);
      player.sendMessage(`旗の色は ${placedColor ?? "不明"} です`);

      if (placedColor && placedName) {
        addWaypoint(
          player.dimension,
          Vector3Utils.add(Vector3Utils.floor(block.location), {
            x: 0.5,
            y: 0.5,
            z: 0.5,
          }),
          placedColor,
          placedName,
        );
      }
    }
  });

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

  // 毎tick更新により、10tickのイージングズームおよび視点追従、ナビゲーションHUDを完全になめらかにする
  system.runInterval(() => {
    for (let player of world.getAllPlayers()) {
      updatePlayerVirtualNavHUD(player);
      displayHUDWaypoints(player);
    }
  }, 1);
}
