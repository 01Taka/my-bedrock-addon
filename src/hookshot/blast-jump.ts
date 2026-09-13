import {
  Player,
  Vector3,
  EquipmentSlot,
  InputButton,
  ButtonState,
  PlayerButtonInputAfterEvent,
  EntityHurtBeforeEvent,
  EntityDamageCause,
  system,
} from "@minecraft/server";
import {
  HOOKSHOT_ITEM_ID,
  HOOKSHOT_BLAST_CONFIG,
  HookshotBlastConfig,
} from "./config";
import { getPlayerMovementInput } from "./player-movement";

// プレイヤーごとの爆風ジャンプ可能状態（true: 使用可能 / false: 使用済み）
const blastJumpStateMap = new Map<string, boolean>();

// プレイヤーが空中でジャンプボタンを離したか（空中で一度離してから再度押さないと発動不可）
const jumpButtonReleasedInAirMap = new Map<string, boolean>();

// 空中でのフックショット着弾フラグ（true: フックショット着弾後の爆風ジャンプ / false: 着弾前）
const hookshotLandedInAirMap = new Map<string, boolean>();

/** 落下ダメージ無効化の状態 */
interface FallImmunityState {
  /** 爆風ジャンプ発動時のY座標 */
  startY: number;
  /** startY - IMMUNITY_TRIGGER_Y_OFFSET 以下に到達してからの残りtick数 */
  remainingTicks: number;
  /** 発動してからの経過tick数（発動直後の誤判定防止用） */
  elapsedTicks: number;
  /** 接地（isOnGround）が継続しているtick数 */
  groundTicks: number;
}

// プレイヤーごとの落下ダメージ無効化状態
const fallDamageImmunityMap = new Map<string, FallImmunityState>();

/**
 * プレイヤーが現在落下ダメージ無効化中か判定
 */
export function isFallDamageImmune(player: Player): boolean {
  return fallDamageImmunityMap.has(player.id);
}

/**
 * 爆風ジャンプによる落下ダメージ無効化を開始
 * （発動時 - 3 ブロック以下になってから規定時間を過ぎるか、着地するまで有効）
 */
export function startFallDamageImmunity(
  player: Player,
  config: HookshotBlastConfig = HOOKSHOT_BLAST_CONFIG,
): void {
  fallDamageImmunityMap.set(player.id, {
    startY: player.location.y,
    remainingTicks: config.FALL_DAMAGE_IMMUNITY_TICKS,
    elapsedTicks: 0,
    groundTicks: 0,
  });
}

/**
 * 落下ダメージ無効化状態を通知なしでクリア（着地時など）
 */
export function clearFallDamageImmunity(player: Player): void {
  fallDamageImmunityMap.delete(player.id);
}

/**
 * 落下ダメージ無効化状態の更新処理（定期ループから実行）
 * @param player プレイヤー
 * @param deltaTicks 経過tick数
 * @param config 設定
 */
export function updateFallDamageImmunity(
  player: Player,
  deltaTicks: number = 2,
  config: HookshotBlastConfig = HOOKSHOT_BLAST_CONFIG,
): void {
  const state = fallDamageImmunityMap.get(player.id);
  if (!state) return;

  state.elapsedTicks += deltaTicks;

  // 地面に着地している場合
  if (player.isOnGround) {
    if (state.elapsedTicks > 4) {
      state.groundTicks += deltaTicks;
      // 接地状態が安定（4tick以上継続）したら、ダメージ判定通過済みと判断して静かにクリア
      if (state.groundTicks >= 4) {
        clearFallDamageImmunity(player);
        return;
      }
    }
    return;
  } else {
    state.groundTicks = 0;
  }

  // 空中で発動地点 - IMMUNITY_TRIGGER_Y_OFFSET 以下の高さに達している場合、タイマーをカウントダウン
  const triggerY = state.startY - config.IMMUNITY_TRIGGER_Y_OFFSET;
  if (player.location.y <= triggerY) {
    state.remainingTicks -= deltaTicks;
    if (state.remainingTicks <= 0) {
      // 規定時間超過により無効化終了（音とエフェクトで通知）
      clearFallDamageImmunity(player);

      try {
        const headPos = player.getHeadLocation();
        const offsets = [
          { x: 0, y: 0, z: 0 },
          { x: 0.25, y: -0.2, z: 0.25 },
          { x: -0.25, y: -0.2, z: -0.25 },
          { x: 0.25, y: -0.2, z: -0.25 },
          { x: -0.25, y: -0.2, z: 0.25 },
        ];
        for (const off of offsets) {
          player.dimension.spawnParticle(config.IMMUNITY_EXPIRE_PARTICLE, {
            x: headPos.x + off.x,
            y: headPos.y + off.y,
            z: headPos.z + off.z,
          });
        }
        player.playSound(config.IMMUNITY_EXPIRE_SOUND, {
          volume: config.IMMUNITY_EXPIRE_SOUND_VOLUME,
          pitch: config.IMMUNITY_EXPIRE_SOUND_PITCH,
        });
      } catch {
        // 例外防止
      }
    }
  }
}

/**
 * 落下ダメージイベントの処理ハンドラー（爆風ジャンプ後の落下ダメージ無効化期間中はダメージをキャンセル）
 */
export function handleBlastJumpDamage(event: EntityHurtBeforeEvent): void {
  if (!(event.hurtEntity instanceof Player)) return;

  const player = event.hurtEntity;
  const cause = event.damageSource.cause;

  if (cause === EntityDamageCause.fall) {
    if (isFallDamageImmune(player)) {
      event.cancel = true;
      event.damage = 0;
      // 着地による落下ダメージを無効化したので、次tickで静かに無効化を終了
      system.run(() => {
        if (player.isValid) {
          clearFallDamageImmunity(player);
        }
      });
    }
  }
}

/**
 * プレイヤーがメインハンドにフックショットを持っているか判定
 */
export function isHoldingHookshot(player: Player): boolean {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      return mainhand?.typeId === HOOKSHOT_ITEM_ID;
    }
  } catch {
    // 取得不可時はfalse
  }
  return false;
}

/**
 * プレイヤーの爆風ジャンプが使用可能か判定
 */
export function isBlastJumpReady(player: Player): boolean {
  if (!blastJumpStateMap.has(player.id)) {
    return true; // デフォルトは準備完了
  }
  return blastJumpStateMap.get(player.id) === true;
}

/**
 * プレイヤーの爆風ジャンプ状態をリセット（READY状態にする）
 */
export function resetBlastJump(player: Player): void {
  if (
    !blastJumpStateMap.has(player.id) ||
    blastJumpStateMap.get(player.id) === false
  ) {
    blastJumpStateMap.set(player.id, true);
  }
}

/**
 * プレイヤーの爆風ジャンプ状態を使用済みにする
 */
export function consumeBlastJump(player: Player): void {
  blastJumpStateMap.set(player.id, false);
}

/**
 * 空中でジャンプボタンが離された状態を設定
 */
export function setJumpButtonReleasedInAir(
  player: Player,
  released: boolean,
): void {
  jumpButtonReleasedInAirMap.set(player.id, released);
}

/**
 * 空中でのフックショット着弾状態を設定
 */
export function setHookshotLandedInAir(player: Player, landed: boolean): void {
  hookshotLandedInAirMap.set(player.id, landed);
}

/**
 * プレイヤーが着地した際の初期化処理
 */
export function handlePlayerGroundTouch(player: Player): void {
  resetBlastJump(player);
  setHookshotLandedInAir(player, false);
  setJumpButtonReleasedInAir(player, false);
}

/**
 * ボタン入力イベントの処理ハンドラー
 */
export function handleBlastJumpButtonInput(
  event: PlayerButtonInputAfterEvent,
): void {
  if (event.button !== InputButton.Jump) return;

  const player = event.player;
  if (!player.isValid) return;

  // ジャンプボタンを離した時
  if (event.newButtonState === ButtonState.Released) {
    if (!player.isOnGround) {
      // 空中でジャンプボタンを離したことを記録
      setJumpButtonReleasedInAir(player, true);
    }
    return;
  }

  // ジャンプボタンを押した時
  if (event.newButtonState === ButtonState.Pressed) {
    if (player.isOnGround) {
      // 地面にいる状態でのジャンプは通常ジャンプとして扱い、空中離脱フラグをリセット
      setJumpButtonReleasedInAir(player, false);
    } else {
      // 空中でジャンプボタンを押した時
      // 空中で一度ボタンを離していない場合（地面から押しっぱなしのジャンプ等）は発動しない
      if (jumpButtonReleasedInAirMap.get(player.id) !== true) {
        return;
      }
      executeBlastJump(player);
    }
  }
}

/**
 * 空中での爆風ジャンプを実行
 */
export function executeBlastJump(
  player: Player,
  config: HookshotBlastConfig = HOOKSHOT_BLAST_CONFIG,
): boolean {
  if (!player.isValid) return false;

  // フックショットを所持しているか
  if (!isHoldingHookshot(player)) return false;

  // 地上にいる場合は発動しない（空中でのみ発動）
  if (player.isOnGround) return false;

  // 空中で一度ボタンを離していない場合は発動しない
  if (jumpButtonReleasedInAirMap.get(player.id) !== true) return false;

  // すでに使用済みか
  if (!isBlastJumpReady(player)) return false;

  // 使用済みフラグを設定
  consumeBlastJump(player);
  // 再度空中でボタンを離すまで連続発動を防止
  setJumpButtonReleasedInAir(player, false);

  // フックショット着弾後か着弾前かに応じた設定値を選択
  const isPostHook = hookshotLandedInAirMap.get(player.id) === true;
  const inputWeight = isPostHook
    ? config.POST_HOOK_HORIZONTAL_INPUT_WEIGHT
    : config.PRE_HOOK_HORIZONTAL_INPUT_WEIGHT;
  const maxSpeed = isPostHook
    ? config.POST_HOOK_MAX_IMPULSE_SPEED
    : config.PRE_HOOK_MAX_IMPULSE_SPEED;

  // 1. 移動入力と視線方向から水平ベクトルを計算
  const moveInput = getPlayerMovementInput(player);
  const viewDir = player.getViewDirection();
  const viewDistHoriz = Math.hypot(viewDir.x, viewDir.z);

  const viewFwdX = viewDistHoriz > 0.0001 ? viewDir.x / viewDistHoriz : 0;
  const viewFwdZ = viewDistHoriz > 0.0001 ? viewDir.z / viewDistHoriz : 0;

  // 右方向ベクトル
  const rightX = -viewFwdZ;
  const rightZ = viewFwdX;

  // ワールド座標系での移動入力ベクトル
  const inputWorldX = moveInput.y * viewFwdX + moveInput.x * rightX;
  const inputWorldZ = moveInput.y * viewFwdZ + moveInput.x * rightZ;

  // 2. 現在の速度を取得
  let currentX = 0;
  let currentY = 0;
  let currentZ = 0;
  try {
    const currentVel = player.getVelocity();
    if (currentVel) {
      currentX = currentVel.x ?? 0;
      currentY = currentVel.y ?? 0;
      currentZ = currentVel.z ?? 0;
    }
  } catch {
    // 取得不可時は0
  }

  const currentHorizSpeed = Math.hypot(currentX, currentZ);

  // 進行方向単位ベクトルの決定（移動中なら移動方向、静止中なら視線方向）
  let uDirX = viewFwdX;
  let uDirZ = viewFwdZ;
  const isMoving = currentHorizSpeed > 0.05;
  if (isMoving) {
    uDirX = currentX / currentHorizSpeed;
    uDirZ = currentZ / currentHorizSpeed;
  }

  // 3. 入力ベクトルを「進行方向に対して平行な成分」と「垂直（横）な成分」に分解
  const parallelInput = inputWorldX * uDirX + inputWorldZ * uDirZ;
  const perpInputX = inputWorldX - parallelInput * uDirX;
  const perpInputZ = inputWorldZ - parallelInput * uDirZ;

  // 4. 垂直なベクトル（横方向のベクトル）のインパルス計算
  // ベクトルの長さに応じた勢いを現在の勢いに加算
  const steerImpulseX = perpInputX * inputWeight;
  const steerImpulseZ = perpInputZ * inputWeight;

  // 5. 平行方向のベクトル（前 / なし / 後ろ の3段階判定）
  const deadzone = config.PARALLEL_DEADZONE ?? 0.2;
  const isForward = parallelInput > deadzone;
  const isBackward = parallelInput < -deadzone;
  const dirConfig = isForward
    ? config.DIRECTIONAL.FORWARD
    : isBackward
      ? config.DIRECTIONAL.BACKWARD
      : config.DIRECTIONAL.NEUTRAL;

  // 水平速度維持率
  const actualRetentionRate = dirConfig.HORIZONTAL_RETENTION;

  // 垂直(Y方向)減衰インパルス計算（上昇時 / 落下時）
  let dampingImpulseY = 0;
  if (currentY < 0) {
    dampingImpulseY = currentY * (dirConfig.DOWNWARD_RETENTION - 1.0);
  } else {
    dampingImpulseY = currentY * (dirConfig.UPWARD_RETENTION - 1.0);
  }

  // 追加上方向インパルス
  const upwardImpulse = dirConfig.UPWARD_IMPULSE;

  // 追加平行インパルス（水平方向インパルス または 静止時前進推進力）
  let extraParallelImpulseX = 0;
  let extraParallelImpulseZ = 0;
  if (dirConfig.HORIZONTAL_IMPULSE !== 0) {
    extraParallelImpulseX = uDirX * dirConfig.HORIZONTAL_IMPULSE;
    extraParallelImpulseZ = uDirZ * dirConfig.HORIZONTAL_IMPULSE;
  } else if (!isMoving && isForward) {
    extraParallelImpulseX = uDirX * (config.FORWARD_IMPULSE_FORCE ?? 0.5);
    extraParallelImpulseZ = uDirZ * (config.FORWARD_IMPULSE_FORCE ?? 0.5);
  }

  // 水平方向の新規追加インパルス（横方向加算 ＋ 平行追加インパルス）
  let addedImpulseX = steerImpulseX + extraParallelImpulseX;
  let addedImpulseZ = steerImpulseZ + extraParallelImpulseZ;

  // 新規入力インパルスの制限
  const inputSpeed = Math.hypot(addedImpulseX, addedImpulseZ);
  if (inputSpeed > maxSpeed && inputSpeed > 0.0001) {
    const scale = maxSpeed / inputSpeed;
    addedImpulseX *= scale;
    addedImpulseZ *= scale;
  }

  // --- 処理順序: 減速処理 -> 追加の勢い -> 落下ダメージ無効化 ---

  // ① 減速処理（既存の慣性を減衰）
  const retention = Math.max(0, actualRetentionRate);
  const dampingImpulseX = (retention - 1.0) * currentX;
  const dampingImpulseZ = (retention - 1.0) * currentZ;

  player.applyImpulse({
    x: dampingImpulseX,
    y: dampingImpulseY,
    z: dampingImpulseZ,
  });

  // ② 追加の勢い（上方向インパルス ＋ 入力方向への水平インパルス）
  player.applyImpulse({
    x: addedImpulseX,
    y: upwardImpulse,
    z: addedImpulseZ,
  });

  // ③ 爆風ジャンプ後の落下ダメージ無効化を開始（2秒間。切れたタイミングで音とエフェクトで通知）
  startFallDamageImmunity(player, config);

  // 爆風パーティクルとサウンドの再生
  try {
    const feetPos: Vector3 = {
      x: player.location.x,
      y: player.location.y,
      z: player.location.z,
    };

    // ① 大爆発エフェクト（TNT爆発）
    if (config.PARTICLE_ID) {
      player.dimension.spawnParticle(config.PARTICLE_ID, feetPos);
    }
    // ② 風圧爆発エフェクト
    if (config.WIND_PARTICLE_ID) {
      player.dimension.spawnParticle(config.WIND_PARTICLE_ID, feetPos);
    }
    // ③ 煙爆発エフェクト
    if (config.SMOKE_PARTICLE_ID) {
      player.dimension.spawnParticle(config.SMOKE_PARTICLE_ID, feetPos);
      player.dimension.spawnParticle(config.SMOKE_PARTICLE_ID, {
        x: feetPos.x + 0.2,
        y: feetPos.y,
        z: feetPos.z + 0.2,
      });
      player.dimension.spawnParticle(config.SMOKE_PARTICLE_ID, {
        x: feetPos.x - 0.2,
        y: feetPos.y,
        z: feetPos.z - 0.2,
      });
    }

    // 爆発音と風圧音の再生
    if (config.SOUND_ID) {
      player.playSound(config.SOUND_ID, {
        volume: config.SOUND_VOLUME,
        pitch: isPostHook ? 1.4 : config.SOUND_PITCH,
      });
    }
    player.playSound("breeze.wind_charge.burst", {
      volume: 0.9,
      pitch: isPostHook ? 1.3 : 1.1,
    });
  } catch {
    // 例外防止
  }

  // アクションバーHUDを即座に更新
  updateBlastHud(player);

  return true;
}

/**
 * フックショット所持プレイヤーのアクションバーHUDを更新
 */
export function updateBlastHud(player: Player): void {
  if (!player.isValid) return;

  if (isHoldingHookshot(player)) {
    const ready = isBlastJumpReady(player);
    player.onScreenDisplay.setActionBar(
      ready ? "§a✦ BLAST READY§r" : "§7✧ BLAST USED§r",
    );
  }
}
