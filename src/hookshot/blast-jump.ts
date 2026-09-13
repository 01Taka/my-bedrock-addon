import {
  Player,
  Vector3,
  EquipmentSlot,
  InputButton,
  ButtonState,
  PlayerButtonInputAfterEvent,
} from "@minecraft/server";
import { HookshotBlastConfig } from "./types";
import { getPlayerMovementInput } from "./player-movement";

/** フックショットのアイテムID */
export const HOOKSHOT_ITEM_ID = "addon:hookshot";

/**
 * 爆風ジャンプおよび関連アクションの内部設定
 */
export const HOOKSHOT_BLAST_CONFIG: HookshotBlastConfig = {
  /** 上方向へのインパルス強度 */
  UPWARD_IMPULSE: 1.0,
  /** 移動入力（WASD/スティック）による水平方向インパルスの重み（設定変更可能） */
  HORIZONTAL_INPUT_WEIGHT: 0.75,
  /** 最大インパルス速度 */
  MAX_IMPULSE_SPEED: 2.5,
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
};

// プレイヤーごとの爆風ジャンプ可能状態（true: 使用可能 / false: 使用済み）
const blastJumpStateMap = new Map<string, boolean>();

// プレイヤーが地面ジャンプ後にジャンプボタンを一度離したか（false: 地面からジャンプボタン押しっぱなし / true: 離した）
const jumpButtonReleasedMap = new Map<string, boolean>();

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
 * ジャンプボタンを離した状態を設定
 */
export function setJumpButtonReleased(player: Player): void {
  jumpButtonReleasedMap.set(player.id, true);
}

/**
 * 地面でジャンプボタンを押した状態を設定（空中で一度離すまで爆風ジャンプ不可）
 */
export function setJumpButtonPressedOnGround(player: Player): void {
  jumpButtonReleasedMap.set(player.id, false);
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
    setJumpButtonReleased(player);
    return;
  }

  // ジャンプボタンを押した時
  if (event.newButtonState === ButtonState.Pressed) {
    if (player.isOnGround) {
      // 地面にいる状態でジャンプボタンを押した -> 地面ジャンプフラグ（離すまで空中爆風不可）
      setJumpButtonPressedOnGround(player);
    } else {
      // 空中でジャンプボタンを押した
      // 地面で押したジャンプボタンを一度離していない場合は発動しない
      if (jumpButtonReleasedMap.get(player.id) === false) {
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

  // 地面ジャンプ後に一度ボタンを離していない場合は発動しない
  if (jumpButtonReleasedMap.get(player.id) === false) return false;

  // すでに使用済みか
  if (!isBlastJumpReady(player)) return false;

  // 使用済みフラグを設定
  consumeBlastJump(player);
  // 再度ボタンを離すまで空中での連続発動を防止
  setJumpButtonPressedOnGround(player);

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

  // 2. 現在の速度を取得してY軸の勢いを完全に無視（相殺）
  let currentY = 0;
  try {
    const currentVel = player.getVelocity();
    if (currentVel && typeof currentVel.y === "number") {
      currentY = currentVel.y;
    }
  } catch {
    // 取得不可時は0
  }

  // 水平入力インパルス
  let impulseX = inputWorldX * config.HORIZONTAL_INPUT_WEIGHT;
  let impulseZ = inputWorldZ * config.HORIZONTAL_INPUT_WEIGHT;

  // 水平入力インパルスの制限
  const horizSpeed = Math.hypot(impulseX, impulseZ);
  if (horizSpeed > config.MAX_IMPULSE_SPEED && horizSpeed > 0.0001) {
    const scale = config.MAX_IMPULSE_SPEED / horizSpeed;
    impulseX *= scale;
    impulseZ *= scale;
  }

  // Y軸の勢いを相殺した上で上方向インパルスを適用（現在の落下/上昇速度をリセットして一定の上昇力を付与）
  const impulseY = config.UPWARD_IMPULSE - currentY;

  // プレイヤーにインパルスを適用（水平方向の慣性は維持されたまま追加インパルスが加わる）
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
      pitch: config.SOUND_PITCH,
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
