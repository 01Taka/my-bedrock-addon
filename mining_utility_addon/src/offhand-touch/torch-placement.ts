import {
  world,
  system,
  Direction,
  Vector3,
  EquipmentSlot,
  BlockPermutation,
  PlayerInteractWithBlockBeforeEvent,
  GameMode,
} from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import { isSettingEnabled, SETTING_KEYS } from "../settings";
import { TORCH_LIGHT_LEVELS } from "./constants";
import { addonPlacedLights, getLightPosKey } from "./light-block-manager";
import {
  isInteractiveBlock,
  isAllowedMainhandItem,
} from "./interact-action-checker";
import {
  isFullBlockFace,
  isReplaceableForTorch,
} from "./torch-support-validator";

// 各面に対応する隣接座標オフセット
const faceOffsets: Record<Direction, Vector3> = {
  [Direction.Up]: { x: 0, y: 1, z: 0 },
  [Direction.Down]: { x: 0, y: -1, z: 0 },
  [Direction.North]: { x: 0, y: 0, z: -1 },
  [Direction.South]: { x: 0, y: 0, z: 1 },
  [Direction.East]: { x: 1, y: 0, z: 0 },
  [Direction.West]: { x: -1, y: 0, z: 0 },
};

// ヒット面（右クリックされた面）と、設置されるたいまつが接着すべき壁の方向（torch_facing_direction）の対応表
// 例: 壁の「南面」をクリックした場合、隣接座標に置かれたたいまつから見て壁は「北」にあるため "north" を指定する
const facingMap: Partial<Record<Direction, string>> = {
  [Direction.Up]: "top",
  [Direction.North]: "south",
  [Direction.South]: "north",
  [Direction.East]: "west",
  [Direction.West]: "east",
};

// 連続設置防止用クールダウン（プレイヤーID -> 最終設置tick）
const lastTorchPlaceTick = new Map<string, number>();
const PLACE_COOLDOWN_TICKS = 4; // 0.2秒

/**
 * プレイヤーがブロックを右クリックした際にオフハンドのたいまつを設置するハンドラー
 */
export function handleTorchPlaceOnInteract(
  event: PlayerInteractWithBlockBeforeEvent,
): void {
  const { player, block, itemStack, isFirstEvent } = event;

  // 押しっぱなしリピートの防止
  if (!isFirstEvent) return;

  // アドオン機能が無効な場合はスキップ
  if (!isSettingEnabled(player, SETTING_KEYS.TORCH)) return;

  // クールダウン判定
  const currentTick = system.currentTick;
  const lastTick = lastTorchPlaceTick.get(player.id) ?? 0;
  if (currentTick - lastTick < PLACE_COOLDOWN_TICKS) return;

  // オフハンドのたいまつを確認
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  const offhandItem = equippable.getEquipment(EquipmentSlot.Offhand);
  if (!offhandItem || !(offhandItem.typeId in TORCH_LIGHT_LEVELS)) return;

  // スニークしていない場合、インタラクティブブロックへの操作が優先される
  if (!player.isSneaking && isInteractiveBlock(block)) {
    return;
  }

  // メインハンドが素手・剣・つるはし以外の場合はスキップ
  if (!isAllowedMainhandItem(itemStack)) {
    return;
  }

  // プレイヤーの視線方向に水や草を貫通するレイキャストを飛ばす
  const hit = player.getBlockFromViewDirection({
    maxDistance: 7,
    includeLiquidBlocks: false,
    includePassableBlocks: false,
  });

  if (!hit) return;

  const hitBlock = hit.block;
  const hitFace = hit.face;

  // フルブロックの面か判定（MCPE-223452バグを回避するためfaceLocationは使用しない）
  if (!isFullBlockFace(hitBlock, hitFace)) {
    return;
  }

  // レイのヒット面に隣接するブロックを取得
  const offset = faceOffsets[hitFace];
  const placeLocation = Vector3Utils.add(hitBlock.location, offset);
  const adjacentBlock = player.dimension.getBlock(placeLocation);

  // 隣接ブロックが空気、ライトブロック、または置き換え可能な草・落ち葉であるかを判定
  if (!adjacentBlock || !isReplaceableForTorch(adjacentBlock.typeId)) {
    return;
  }

  const facing = facingMap[hitFace];
  if (!facing) return;

  // イベントをキャンセルしてバニラの追加動作を防止
  event.cancel = true;
  lastTorchPlaceTick.set(player.id, currentTick);

  // 次のtickでブロック設置およびアイテム消費を実行
  system.run(() => {
    try {
      const torchPermutation = BlockPermutation.resolve(offhandItem.typeId, {
        torch_facing_direction: facing,
      });
      adjacentBlock.setPermutation(torchPermutation);

      // ライトブロック追跡から除外
      const lightKey = getLightPosKey(player.dimension.id, placeLocation);
      if (addonPlacedLights.has(lightKey)) {
        addonPlacedLights.delete(lightKey);
      }

      // 設置効果音の再生
      player.dimension.playSound("dig.wood", placeLocation, {
        volume: 1.0,
        pitch: 0.8,
      });

      // サバイバルモード等はオフハンドのたいまつを1個消費
      if (player.getGameMode() !== GameMode.Creative) {
        if (offhandItem.amount > 1) {
          player.runCommand(
            `replaceitem entity @s slot.weapon.offhand 0 ${offhandItem.typeId} ${offhandItem.amount - 1}`,
          );
        } else {
          player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
        }
      }
    } catch (e) {
      console.warn("[Torch] たいまつの設置に失敗しました:", e);
    }
  });
}

// プレイヤー退出時にクールダウン用マップをクリーンアップ
world.afterEvents.playerLeave.subscribe((event) => {
  lastTorchPlaceTick.delete(event.playerId);
});
