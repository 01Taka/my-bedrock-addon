import {
  Player,
  Vector3,
  EquipmentSlot,
  InputButton,
  ButtonState,
  PlayerButtonInputAfterEvent,
  EntityHurtBeforeEvent,
  EntityDamageCause,
} from "@minecraft/server";
import { HookshotBlastConfig } from "./types";
import { getPlayerMovementInput } from "./player-movement";

/** フックショットのアイテムID */
export const HOOKSHOT_ITEM_ID = "addon:hookshot";

/**
 * 爆風ジャンプおよび関連アクションの内部設定
 */
export const HOOKSHOT_BLAST_CONFIG: HookshotBlastConfig = {
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 上方向インパルス強度 */
  PRE_HOOK_UPWARD_IMPULSE: 1.2,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  PRE_HOOK_DOWNWARD_INERTIA_RETENTION: 0.3,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 水平慣性の維持率（0.0: 完全リセット, 1.0: 減衰なし, 0.4: 40%維持） */
  PRE_HOOK_HORIZONTAL_INERTIA_RETENTION: 0.4,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  PRE_HOOK_HORIZONTAL_INPUT_WEIGHT: 0.75,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 最大速度制限 */
  PRE_HOOK_MAX_IMPULSE_SPEED: 2.5,

  /** フックショット着弾後の爆風ジャンプ: 上方向インパルス強度 */
  POST_HOOK_UPWARD_IMPULSE: 1.4,
  /** フックショット着弾後の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  POST_HOOK_DOWNWARD_INERTIA_RETENTION: 0.3,
  /** フックショット着弾後の爆風ジャンプ: 水平慣性の維持率（0.0: 完全リセット, 1.0: 減衰なし, 0.6: 60%維持） */
  POST_HOOK_HORIZONTAL_INERTIA_RETENTION: 0.6,
  /** フックショット着弾後の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  POST_HOOK_HORIZONTAL_INPUT_WEIGHT: 0.9,
  /** フックショット着弾後の爆風ジャンプ: 最大速度制限 */
  POST_HOOK_MAX_IMPULSE_SPEED: 3.0,

  /** 爆風パーティクルID */
  PARTICLE_ID: "minecraft:wind_charge_explosion",
  /** 爆風サウンドID */
  SOUND_ID: "breeze.wind_charge.burst",
  /** サウンド音量 */
  SOUND_VOLUME: 1.0,
  /** サウンドピッチ */
  SOUND_PITCH: 1.2,
  /** モブ引き寄せタグ名 */
  PULLED_TAG: "hookshot:pulled",
  /** モブ引き寄せタグの持続時間（tick単位: 20tick = 1秒） */
  PULL_TAG_DURATION_TICKS: 20,
  /** 引き寄せモブへの攻撃ダメージ（16 = 8ハート分） */
  FINISHER_DAMAGE: 16,
  /** 引き寄せモブへの視線方向ノックバック強度 */
  FINISHER_KNOCKBACK_FORCE: 1.8,
  /** 引き寄せモブへのフィニッシャー攻撃時の上方向ノックバック補正 */
  FINISHER_VERTICAL_LIFT: 0.35,
  /** 爆風ジャンプ地点を基準にした落下ダメージの無効化・軽減機能（ウィンドチャージ仕様） */
  RESET_FALL_DAMAGE_HEIGHT: true,
  /** 落下ダメージを受けない安全落下距離（ブロック数・バニラ基準: 3） */
  SAFE_FALL_DISTANCE: 3,
};

// 最後に爆風ジャンプを発動した高さY座標（ウィンドチャージ仕様の落下ダメージ基準点）
const lastBlastJumpYMap = new Map<string, number>();

// プレイヤーごとの爆風ジャンプ可能状態（true: 使用可能 / false: 使用済み）
const blastJumpStateMap = new Map<string, boolean>();

// プレイヤーが空中でジャンプボタンを離したか（空中で一度離してから再度押さないと発動不可）
const jumpButtonReleasedInAirMap = new Map<string, boolean>();

// 空中でのフックショット着弾フラグ（true: フックショット着弾後の爆風ジャンプ / false: 着弾前）
const hookshotLandedInAirMap = new Map<string, boolean>();

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
export function setJumpButtonReleasedInAir(player: Player, released: boolean): void {
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

  // 爆風ジャンプを発動した高さY座標を記録（落下ダメージ計算の基準点）
  if (config.RESET_FALL_DAMAGE_HEIGHT) {
    lastBlastJumpYMap.set(player.id, player.location.y);
  }

  // フックショット着弾後か着弾前かに応じた設定値を選択
  const isPostHook = hookshotLandedInAirMap.get(player.id) === true;
  const upwardImpulse = isPostHook
    ? config.POST_HOOK_UPWARD_IMPULSE
    : config.PRE_HOOK_UPWARD_IMPULSE;
  const downwardRetentionRate = isPostHook
    ? config.POST_HOOK_DOWNWARD_INERTIA_RETENTION
    : config.PRE_HOOK_DOWNWARD_INERTIA_RETENTION;
  const retentionRate = isPostHook
    ? config.POST_HOOK_HORIZONTAL_INERTIA_RETENTION
    : config.PRE_HOOK_HORIZONTAL_INERTIA_RETENTION;
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

  // 水平方向の新規入力インパルス
  let addedImpulseX = inputWorldX * inputWeight;
  let addedImpulseZ = inputWorldZ * inputWeight;

  // 新規入力インパルスの制限
  const inputSpeed = Math.hypot(addedImpulseX, addedImpulseZ);
  if (inputSpeed > maxSpeed && inputSpeed > 0.0001) {
    const scale = maxSpeed / inputSpeed;
    addedImpulseX *= scale;
    addedImpulseZ *= scale;
  }

  // 元の水平速度を設定値（retentionRate）に応じて減衰させ、新規インパルスを加算
  const retention = Math.max(0, retentionRate);
  const impulseX = (retention - 1.0) * currentX + addedImpulseX;
  const impulseZ = (retention - 1.0) * currentZ + addedImpulseZ;

  // Y軸の勢いの計算:
  // 下方向（落下速度: currentY < 0）の場合は完全相殺ではなく、倍率（downwardRetentionRate）で減速させた上で上昇インパルスを加算
  let impulseY = upwardImpulse;
  if (currentY < 0) {
    const downwardRetention = Math.max(0, downwardRetentionRate);
    impulseY = upwardImpulse + currentY * (downwardRetention - 1.0);
  } else {
    impulseY = upwardImpulse;
  }

  // プレイヤーにインパルスを適用（元の速度が減衰された後に追加の勢いが付与される）
  player.applyImpulse({
    x: impulseX,
    y: impulseY,
    z: impulseZ,
  });

  // 足元に爆風パーティクルとサウンドをスポーン
  try {
    const feetPos: Vector3 = {
      x: player.location.x,
      y: player.location.y,
      z: player.location.z,
    };
    player.dimension.spawnParticle(config.PARTICLE_ID, feetPos);
    player.playSound(config.SOUND_ID, {
      volume: config.SOUND_VOLUME,
      pitch: isPostHook ? 1.4 : config.SOUND_PITCH,
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

/**
 * 爆風ジャンプによる落下ダメージ軽減・無効化ハンドラー（ウィンドチャージ仕様）
 */
export function handleBlastJumpFallDamage(
  event: EntityHurtBeforeEvent,
  config: HookshotBlastConfig = HOOKSHOT_BLAST_CONFIG,
): void {
  if (!config.RESET_FALL_DAMAGE_HEIGHT) return;
  if (event.damageSource.cause !== EntityDamageCause.fall) return;

  const entity = event.hurtEntity;
  if (!(entity instanceof Player)) return;

  const blastY = lastBlastJumpYMap.get(entity.id);
  if (blastY === undefined) return;

  const landY = entity.location.y;
  const fallDistanceFromBlast = blastY - landY;

  // 爆風ジャンプ地点から安全距離（3ブロック）以内であれば落下ダメージを完全無効化
  if (fallDistanceFromBlast <= config.SAFE_FALL_DISTANCE) {
    event.cancel = true;
  } else {
    // 爆風ジャンプ地点より下へ落下した場合は、その地点からの距離のみで落下ダメージを再計算・軽減
    const recalculatedDamage = Math.max(
      0,
      Math.floor(fallDistanceFromBlast - config.SAFE_FALL_DISTANCE),
    );
    if (recalculatedDamage <= 0) {
      event.cancel = true;
    } else if (recalculatedDamage < event.damage) {
      event.damage = recalculatedDamage;
    }
  }

  // 落下ダメージ判定後は記録を削除
  lastBlastJumpYMap.delete(entity.id);
}
