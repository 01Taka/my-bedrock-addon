import { world, system, Player, Vector3 } from "@minecraft/server";
import { Vector3Utils } from "@minecraft/math";
import { isSettingEnabled, SETTING_KEYS } from "../settings";
import {
  activeLights,
  getOffhandTorchLightLevel,
  placeLight,
  removeLight,
  clearPreviousLight,
  isAirOrLightBlock,
} from "./light-block-manager";
import {
  findSuitableLightPosition,
  getLookAtBlock,
} from "./light-position-finder";

/**
 * 動的光源更新ループ（2tick = 0.1秒間隔）
 */
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    const playerId = player.id;

    if (!player.isValid || !playerId) {
      clearPreviousLight(playerId);
      continue;
    }

    // オフハンドたいまつ機能が無効な場合
    if (!isSettingEnabled(player, SETTING_KEYS.TORCH)) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }

    const torchInfo = getOffhandTorchLightLevel(player);

    // たいまつを持っていない場合
    if (!torchInfo) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }

    const prev = activeLights.get(playerId);
    const dimension = player.dimension;

    // 明るさレベルまたはディメンションが変わったら、一度すべてのライトを取り除く
    if (
      prev &&
      (prev.level !== torchInfo.level || prev.dimensionId !== dimension.id)
    ) {
      clearPreviousLight(playerId);
    }

    // 新たに配置したいターゲット座標のリスト
    const newTargetLocations: Vector3[] = [];

    // ① プレイヤー自身（足元/頭）のライト座標
    const suitablePos = findSuitableLightPosition(player);
    if (suitablePos) {
      newTargetLocations.push(suitablePos.pos);
    }

    // ② スニークしている間だけ視線の先の座標を追加（スニーク解除時は追加されない）
    if (player.isSneaking) {
      const lookAtDistances = [5, 10];
      for (const dist of lookAtDistances) {
        const block = getLookAtBlock(player, dist);
        if (block && isAirOrLightBlock(block.typeId)) {
          // リスト内の重複チェック
          if (
            !newTargetLocations.some((pos) =>
              Vector3Utils.equals(pos, block.location),
            )
          ) {
            newTargetLocations.push(block.location);
          }
        }
      }
    }

    // 配置できる場所が1つもない場合
    if (newTargetLocations.length === 0) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }

    // 前回の配置情報を取得（レベルが変わって消去された場合は undefined）
    const currentPrev = activeLights.get(playerId);
    const prevLocations = currentPrev ? currentPrev.locations : [];

    // 【差分更新 1】前回の座標のうち、今回の座標に含まれないブロックを消去（スニーク解除時の視線先など）
    for (const prevPos of prevLocations) {
      const isStillNeeded = newTargetLocations.some((newPos) =>
        Vector3Utils.equals(newPos, prevPos),
      );
      if (!isStillNeeded) {
        removeLight(dimension, prevPos, playerId);
      }
    }

    // 【差分更新 2】同じ座標はスキップし、新規座標のみ配置
    const finalizedLocations: Vector3[] = [];
    for (const targetPos of newTargetLocations) {
      const alreadyPlaced = prevLocations.some((prevPos) =>
        Vector3Utils.equals(prevPos, targetPos),
      );

      if (alreadyPlaced) {
        // すでに前回の配置と同じ座標にある場合は再配置をスキップ（光の再計算を抑制）
        finalizedLocations.push(targetPos);
      } else {
        // 新しい座標にのみ配置
        const success = placeLight(dimension, targetPos, torchInfo.level);
        if (success) {
          finalizedLocations.push(targetPos);
        }
      }
    }

    // activeLightsの更新（明るさレベルも含めて保存）
    activeLights.set(playerId, {
      dimensionId: dimension.id,
      level: torchInfo.level,
      locations: finalizedLocations,
    });
  }
}, 2);

// ==========================================
// 残留防止イベントリスナー（即時消去）
// ==========================================

world.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity instanceof Player) {
    clearPreviousLight(event.deadEntity.id);
  }
});

world.afterEvents.playerDimensionChange.subscribe((event) => {
  clearPreviousLight(event.player.id);
});

world.afterEvents.playerLeave.subscribe((event) => {
  clearPreviousLight(event.playerId);
});
