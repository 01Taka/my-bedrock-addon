import { Player, Entity, Vector3, Vector2 } from "@minecraft/server";
import { PlayerMovementConfig } from "./types";

/**
 * プレイヤー移動の内部設定
 */
export const PLAYER_MOVEMENT_CONFIG: PlayerMovementConfig = {
  /** 着弾可能な距離（ブロック単位） */
  MAX_DISTANCE: 32,
  /** 横方向の重み（横方向の距離に対して加えるインパルス強度の係数） */
  HORIZONTAL_WEIGHT: 0.18,
  /** 縦方向の重み（縦方向の距離に対して加えるインパルス強度の係数） */
  VERTICAL_WEIGHT: 0.16,
  /** 高さオフセット（着弾地点の何マス上を目標とするか） */
  HEIGHT_OFFSET: 1.5,
  /** 発射方向への影響の重み（垂直入力による横方向の偏向係数） */
  STEERING_WEIGHT: 0.5,
  /** 発射距離減衰の重み（発射方向に対して下がる入力による減衰係数） */
  DISTANCE_DAMPING_WEIGHT: 0.5,
  /** 発射距離増幅の重み（発射方向に向かう入力による増幅係数） */
  DISTANCE_BOOST_WEIGHT: 0.5,
};

/**
 * プレイヤーの移動入力ベクトルを取得（フォールバック付き）
 */
export function getPlayerMovementInput(player: Player): Vector2 {
  try {
    if (player.inputInfo) {
      const moveVec = player.inputInfo.getMovementVector();
      if (moveVec) {
        return { x: moveVec.x, y: moveVec.y };
      }
    }
  } catch (e) {
    // inputInfo取得不可時はゼロベクトル
  }
  return { x: 0, y: 0 };
}

/**
 * 指定目標地点に向かってプレイヤーへインパルスを適用
 */
export function applyPlayerMovementImpulse(
  player: Player,
  targetLocation: Vector3,
  config: PlayerMovementConfig = PLAYER_MOVEMENT_CONFIG,
): boolean {
  const playerPos = player.location;

  // 1. 発射ベクトル（差分）の計算
  const deltaX = targetLocation.x - playerPos.x;
  const deltaY = targetLocation.y - playerPos.y;
  const deltaZ = targetLocation.z - playerPos.z;
  const launchDistHoriz = Math.hypot(deltaX, deltaZ);

  // 水平方向の発射単位ベクトル
  const uLaunchX = launchDistHoriz > 0.0001 ? deltaX / launchDistHoriz : 0;
  const uLaunchZ = launchDistHoriz > 0.0001 ? deltaZ / launchDistHoriz : 0;

  // 2. プレイヤーの移動入力ベクトルの取得とワールド空間への変換
  const moveInput = getPlayerMovementInput(player);
  const viewDir = player.getViewDirection();
  const viewDistHoriz = Math.hypot(viewDir.x, viewDir.z);

  // プレイヤーの水平視線単位ベクトル (Forward)
  const viewFwdX = viewDistHoriz > 0.0001 ? viewDir.x / viewDistHoriz : 0;
  const viewFwdZ = viewDistHoriz > 0.0001 ? viewDir.z / viewDistHoriz : 0;

  // プレイヤーの水平右方向単位ベクトル (Right: 時計回りに90度回転)
  const rightX = -viewFwdZ;
  const rightZ = viewFwdX;

  // ワールド座標系での移動入力ベクトル（X-Z平面）
  const inputWorldX = moveInput.y * viewFwdX + moveInput.x * rightX;
  const inputWorldZ = moveInput.y * viewFwdZ + moveInput.x * rightZ;

  // 3. 入力ベクトルを発射方向に対して「水平（平行）成分」と「垂直成分」に分解
  // 平行成分（スカラー積: 発射方向への推進/後退成分）
  const parallelInput = inputWorldX * uLaunchX + inputWorldZ * uLaunchZ;

  // 垂直成分（ベクトル: 発射方向に対して横向きの入力）
  const perpInputX = inputWorldX - parallelInput * uLaunchX;
  const perpInputZ = inputWorldZ - parallelInput * uLaunchZ;

  // 4. 各重みの適用
  // (A) 発射距離の増幅・減衰（平行成分）
  let distanceScale = 1.0;
  if (parallelInput > 0) {
    // 発射方向に向かう入力: 距離増幅
    distanceScale += parallelInput * config.DISTANCE_BOOST_WEIGHT;
  } else if (parallelInput < 0) {
    // 発射方向に対して下がる入力: 距離減衰 (parallelInputは負)
    distanceScale += parallelInput * config.DISTANCE_DAMPING_WEIGHT;
    distanceScale = Math.max(0.1, distanceScale); // 完全に停止しないよう下限を設定
  }

  // (B) 発射方向の偏向（垂直成分）
  const baseHorizImpulse = launchDistHoriz * config.HORIZONTAL_WEIGHT;
  const steerX = perpInputX * config.STEERING_WEIGHT * baseHorizImpulse;
  const steerZ = perpInputZ * config.STEERING_WEIGHT * baseHorizImpulse;

  // 5. 最終インパルスベクトルの合成
  const finalImpulse = {
    x: deltaX * config.HORIZONTAL_WEIGHT * distanceScale + steerX,
    y: deltaY * config.VERTICAL_WEIGHT * distanceScale,
    z: deltaZ * config.HORIZONTAL_WEIGHT * distanceScale + steerZ,
  };

  // プレイヤーにインパルスを適用
  player.applyImpulse(finalImpulse);

  // 発動音の再生
  player.playSound("item.trident.riptide_1", { pitch: 1.2, volume: 1.0 });

  return true;
}

/**
 * ブロックへの移動処理
 */
export function executePlayerMovementToBlock(
  player: Player,
  hitPos: Vector3,
  config: PlayerMovementConfig = PLAYER_MOVEMENT_CONFIG,
): boolean {
  const targetLocation: Vector3 = {
    x: hitPos.x,
    y: hitPos.y + config.HEIGHT_OFFSET,
    z: hitPos.z,
  };

  return applyPlayerMovementImpulse(player, targetLocation, config);
}

/**
 * 大型エンティティ（引き寄せられないモブ）への移動処理
 */
export function executePlayerMovementToEntity(
  player: Player,
  targetEntity: Entity,
  config: PlayerMovementConfig = PLAYER_MOVEMENT_CONFIG,
): boolean {
  const entityLoc = targetEntity.location;
  const targetLocation: Vector3 = {
    x: entityLoc.x,
    y: entityLoc.y + config.HEIGHT_OFFSET,
    z: entityLoc.z,
  };

  return applyPlayerMovementImpulse(player, targetLocation, config);
}
