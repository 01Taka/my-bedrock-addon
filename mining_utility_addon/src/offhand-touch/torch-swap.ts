import { world, system, Player, EquipmentSlot } from "@minecraft/server";
import { isSettingEnabled, SETTING_KEYS } from "../settings";
import { TORCH_LIGHT_LEVELS, SWAP_COOLDOWN_TICKS } from "./constants";

// プレイヤーごとのたいまつ持ち替え最終tick
const lastTorchSwapTick = new Map<string, number>();

/**
 * スニーク腕振り（左クリック）によるメインハンドからオフハンドへのたいまつ持ち替え
 */
export function handleTorchSwap(player: Player, cancelCallback?: () => void) {
  if (!isSettingEnabled(player, SETTING_KEYS.TORCH)) return;
  if (!player.isSneaking) return;

  const currentTick = system.currentTick;
  const lastTick = lastTorchSwapTick.get(player.id) ?? 0;
  if (currentTick - lastTick < SWAP_COOLDOWN_TICKS) {
    return;
  }

  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;

  const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
  const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);

  // メインハンド ➔ オフハンド（オフハンドから外す操作はインベントリから手動で行う）
  if (
    mainhandItem &&
    mainhandItem.typeId in TORCH_LIGHT_LEVELS &&
    !offhandItem
  ) {
    lastTorchSwapTick.set(player.id, currentTick);
    cancelCallback?.();
    system.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.offhand 0 ${mainhandItem.typeId} ${mainhandItem.amount}`,
      );
      equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
    });
    return;
  }
}

// 腕を振る動作（左クリック）検知によるたいまつ持ち替え
world.afterEvents.playerSwingStart.subscribe((event) => {
  if (event.player) {
    handleTorchSwap(event.player);
  }
});

// プレイヤー退出時のメモリ解放
world.afterEvents.playerLeave.subscribe((event) => {
  lastTorchSwapTick.delete(event.playerId);
});
