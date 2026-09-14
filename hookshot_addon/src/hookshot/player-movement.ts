import { Player, Entity, Vector3, Vector2 } from "@minecraft/server";
import { PLAYER_MOVEMENT_CONFIG, PlayerMovementConfig } from "./config";

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

  // 3. 入力ベクトルを発射方向に対して「水平（平行）成分」と「垂直（横）成分」に分解
  // 平行成分（スカラー積: 発射方向への推進/後退成分）
  const parallelInput = inputWorldX * uLaunchX + inputWorldZ * uLaunchZ;

  // 発射方向に対する右方向単位ベクトル (Right: 時計回りに90度回転)
  const uLaunchRightX = -uLaunchZ;
  const uLaunchRightZ = uLaunchX;

  // 横向き入力成分（スカラー積: 右が正 / 左が負）
  const steerInput = inputWorldX * uLaunchRightX + inputWorldZ * uLaunchRightZ;

  // 4. プレイヤー入力によるインパルスの計算
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

  // 基本水平インパルス（発射ベクトル基準 ＋ 前後加減速）
  const baseHorizX = deltaX * config.HORIZONTAL_WEIGHT + parallelAddX;
  const baseHorizZ = deltaZ * config.HORIZONTAL_WEIGHT + parallelAddZ;

  // (B) 発射方向に対する横向き偏向（大きさはそのままにベクトル全体を回転）
  const maxSteerAngleRad =
    ((config.STEERING_ANGLE_DEGREES ?? 30) * Math.PI) / 180;
  const steerAngle = steerInput * maxSteerAngleRad;

  const cos = Math.cos(steerAngle);
  const sin = Math.sin(steerAngle);

  // 5. 最終インパルスベクトルの合成（回転した水平インパルス ＋ 垂直インパルス）
  let impulseX = baseHorizX * cos - baseHorizZ * sin;
  let impulseY = deltaY * config.VERTICAL_WEIGHT;
  let impulseZ = baseHorizX * sin + baseHorizZ * cos;

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
