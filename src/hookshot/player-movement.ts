import { Player, Entity, Vector3, Vector2 } from "@minecraft/server";
import { PlayerMovementConfig } from "./types";

/**
 * プレイヤー移動の内部設定
 */
export const PLAYER_MOVEMENT_CONFIG: PlayerMovementConfig = {
  /** 着弾可能な距離（ブロック単位） */
  MAX_DISTANCE: 150,
  /** インパルスの最大勢い */
  MAX_IMPULSE_DISTANCE: 40,
  /** 横方向の重み（横方向の距離に対して加えるインパルス強度の係数） */
  HORIZONTAL_WEIGHT: 0.2,
  /** 縦方向の重み（縦方向の距離に対して加えるインパルス強度の係数） */
  VERTICAL_WEIGHT: 0.07,
  /** 高さオフセット（着弾地点の何マス上を目標とするか） */
  HEIGHT_OFFSET: 8,
  /** プレイヤーの横入力による偏向加算インパルスの重み */
  STEERING_WEIGHT: 0.9,
  /** プレイヤーの後退入力による減速加算インパルスの重み */
  DISTANCE_DAMPING_WEIGHT: 0.3,
  /** プレイヤーの前進入力による加速加算インパルスの重み */
  DISTANCE_BOOST_WEIGHT: 1.0,
};

/**
 * プレイヤーの移動入力ベクトルを取得（フォールバック付き）
 * Bedrock API の getMovementVector は x: +1 (左) / -1 (右), y: +1 (前) / -1 (後) であるため、
 * x を反転して x: +1 (右) / -1 (左), y: +1 (前) / -1 (後) に正規化します。
 */
export function getPlayerMovementInput(player: Player): Vector2 {
  try {
    if (player.inputInfo) {
      const moveVec = player.inputInfo.getMovementVector();
      if (moveVec) {
        return { x: -moveVec.x, y: moveVec.y };
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

  // 4. プレイヤー入力による加算インパルスの計算（足し算）
  // (A) 発射方向に対する前進加速・後退減速の加算インパルス
  let parallelAdd = 0;
  if (parallelInput > 0) {
    // 発射方向に向かう入力: 前進方向へ加算
    parallelAdd = parallelInput * config.DISTANCE_BOOST_WEIGHT;
  } else if (parallelInput < 0) {
    // 発射方向に対して下がる入力: 後退方向（逆方向）へ加算（parallelInputは負）
    parallelAdd = parallelInput * config.DISTANCE_DAMPING_WEIGHT;
  }
  const parallelAddX = parallelAdd * uLaunchX;
  const parallelAddZ = parallelAdd * uLaunchZ;

  // (B) 発射方向に対する横向き偏向の加算インパルス
  const steerX = perpInputX * config.STEERING_WEIGHT;
  const steerZ = perpInputZ * config.STEERING_WEIGHT;

  // 5. 最終インパルスベクトルの合成（基本インパルスに入力インパルスを足し算）
  let impulseX = deltaX * config.HORIZONTAL_WEIGHT + parallelAddX + steerX;
  let impulseY = deltaY * config.VERTICAL_WEIGHT;
  let impulseZ = deltaZ * config.HORIZONTAL_WEIGHT + parallelAddZ + steerZ;

  // 6. 最大インパルス制限（ブロック換算距離の上限）
  // MAX_IMPULSE_DISTANCE（ブロック）分の勢いを最大値としてクランプ
  if (config.MAX_IMPULSE_DISTANCE > 0) {
    const maxImpulseSpeed =
      config.MAX_IMPULSE_DISTANCE * config.HORIZONTAL_WEIGHT;
    const currentSpeed = Math.hypot(impulseX, impulseY, impulseZ);
    if (currentSpeed > maxImpulseSpeed && currentSpeed > 0.0001) {
      const scale = maxImpulseSpeed / currentSpeed;
      impulseX *= scale;
      impulseY *= scale;
      impulseZ *= scale;
    }
  }

  // プレイヤーにインパルスを適用
  player.applyImpulse({
    x: impulseX,
    y: impulseY,
    z: impulseZ,
  });

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
