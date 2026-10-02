import { world, system, Player, EquipmentSlot } from "@minecraft/server";
import { isSettingEnabled, SETTING_KEYS } from "../settings";
import { TORCH_LIGHT_LEVELS, SWAP_COOLDOWN_TICKS } from "./constants";

// プレイヤーごとのたいまつ持ち替え最終tick
const lastTorchSwapTick = new Map<string, number>();

/**
 * スニーク腕振り（左クリック）によるメインハンドからオフハンドへのたいまつ移動・スタック補充
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

  // メインハンドに対象のたいまつを持っていること
  if (!mainhandItem || !(mainhandItem.typeId in TORCH_LIGHT_LEVELS)) {
    return;
  }

  // オフハンドが空、またはオフハンドに同種のたいまつがあること
  const isOffhandEmpty = !offhandItem;
  const isSameTorch = offhandItem && offhandItem.typeId === mainhandItem.typeId;

  if (!isOffhandEmpty && !isSameTorch) {
    return;
  }

  const currentOffhandAmount = isOffhandEmpty ? 0 : offhandItem.amount;
  // 既にオフハンドが最大スタック（64個）なら移動不要
  if (currentOffhandAmount >= 64) {
    return;
  }

  // 移動可能な個数を算出（最大64個まで）
  const spaceInOffhand = 64 - currentOffhandAmount;
  const transferAmount = Math.min(spaceInOffhand, mainhandItem.amount);
  if (transferAmount <= 0) {
    return;
  }

  const newOffhandAmount = currentOffhandAmount + transferAmount;
  const remainingMainhandAmount = mainhandItem.amount - transferAmount;

  lastTorchSwapTick.set(player.id, currentTick);
  cancelCallback?.();

  system.run(() => {
    // オフハンドの個数を更新
    player.runCommand(
      `replaceitem entity @s slot.weapon.offhand 0 ${mainhandItem.typeId} ${newOffhandAmount}`,
    );

    // メインハンドの残数を更新
    if (remainingMainhandAmount > 0) {
      mainhandItem.amount = remainingMainhandAmount;
      equippable.setEquipment(EquipmentSlot.Mainhand, mainhandItem);
    } else {
      equippable.setEquipment(EquipmentSlot.Mainhand, undefined);
    }
  });
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
