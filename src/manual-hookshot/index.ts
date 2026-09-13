import {
  world,
  system,
  Player,
  ItemUseBeforeEvent,
  Vector3,
  InputButton,
  ButtonState,
  EquipmentSlot,
} from "@minecraft/server";
import { MANUAL_HOOKSHOT_CONFIG } from "./config";

/**
 * プレイヤーが物理的にスニーク（シフト）キーを押下しているかを判定
 * （低所・匍匐時の強制スニークによる誤動作を防止）
 */
function isSneakButtonPressed(player: Player): boolean {
  try {
    if (player.inputInfo) {
      return (
        player.inputInfo.getButtonState(InputButton.Sneak) ===
        ButtonState.Pressed
      );
    }
  } catch {}
  return player.isSneaking;
}

/**
 * プレイヤーごとのフック状態（即時着弾のため着弾座標とスニークカウンタのみ保持）
 */
interface PlayerHookState {
  hitPos: Vector3;
  sneakTickCounter: number;
}

/** プレイヤーIDをキーにしたフック状態マップ */
const playerHooks = new Map<string, PlayerHookState>();

/** プレイヤーIDをキーにした爆風クールダウン終了予定tickマップ */
const blastCooldownMap = new Map<string, number>();

/**
 * プレイヤーがマニュアルフックショットを所持（メインハンドまたはオフハンド）しているか判定
 */
export function isHoldingManualHookshot(player: Player): boolean {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (mainhand?.typeId === MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return true;
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
      if (offhand?.typeId === MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return true;
    }
  } catch {}
  return false;
}

/**
 * 爆風が使用可能か判定（クールダウン中かどうかのチェック）
 */
export function isManualHookshotBlastReady(player: Player): boolean {
  if (!MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_ON_WIND_START) {
    return false;
  }
  const expireTick = blastCooldownMap.get(player.id) ?? 0;
  return system.currentTick >= expireTick;
}

/**
 * 爆風クールダウンの残りtick数を取得（0以上の数値）
 */
export function getBlastCooldownRemainingTicks(player: Player): number {
  const expireTick = blastCooldownMap.get(player.id) ?? 0;
  return Math.max(0, expireTick - system.currentTick);
}

/**
 * 巻き取り開始時の爆風クールダウンを開始
 */
export function startManualHookshotBlastCooldown(player: Player): void {
  blastCooldownMap.set(
    player.id,
    system.currentTick + MANUAL_HOOKSHOT_CONFIG.BLAST_COOLDOWN_TICKS,
  );
}

/**
 * アクションバーに爆風が起こせるかどうかを示すテキストなしピルUIを表示
 */
export function updateManualHookshotHud(player: Player): void {
  if (!player.isValid) return;
  if (!MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_ON_WIND_START) return;

  if (isHoldingManualHookshot(player) || playerHooks.has(player.id)) {
    const ready = isManualHookshotBlastReady(player);
    if (ready) {
      // 爆風使用可能: 緑色のピル（3セグメント）
      player.onScreenDisplay.setActionBar("§a(▰▰▰)");
    } else {
      // クールダウン中: リチャージ進行度を表すピルゲージ（3セグメント・テキストなし）
      const remaining = getBlastCooldownRemainingTicks(player);
      const total = MANUAL_HOOKSHOT_CONFIG.BLAST_COOLDOWN_TICKS;
      const totalSegments = 3;
      const progress = Math.max(0, Math.min(1, 1 - remaining / total));
      const filled = Math.min(
        totalSegments,
        Math.floor(progress * totalSegments),
      );
      const empty = totalSegments - filled;
      const pillBar = "§a" + "▰".repeat(filled) + "§8" + "▰".repeat(empty);
      player.onScreenDisplay.setActionBar(`§7(${pillBar}§7)`);
    }
  }
}

/**
 * プレイヤーのフック状態をリセット
 * @param player 対象プレイヤー
 * @param notify 通知メッセージを再生するか
 * @param isManualRelease プレイヤーの操作による解除か（解除ホップ＆小爆発エフェクトを適用）
 */
export function resetHook(
  player: Player,
  notify: boolean = true,
  isManualRelease: boolean = false,
): void {
  if (!playerHooks.has(player.id)) return;
  playerHooks.delete(player.id);

  // 手動解除かつ空中にいる場合のみ、小爆発エフェクトとホップインパルスを適用（地上では静かに解除）
  if (isManualRelease && !player.isOnGround) {
    // 爆風が起こせる状態（クールダウン中でない）の場合のみ、終了時の爆風とインパクト（ホップ・低速落下）が発生
    const canBlast = isManualHookshotBlastReady(player);
    if (canBlast) {
      try {
        const feetPos = {
          x: player.location.x,
          y: player.location.y + 0.2,
          z: player.location.z,
        };

        // 小爆発エフェクトの発生
        player.dimension.spawnParticle(
          MANUAL_HOOKSHOT_CONFIG.RELEASE_PARTICLE,
          feetPos,
        );
        try {
          player.dimension.spawnParticle("minecraft:wind_explosion_emitter", feetPos);
        } catch {}

        // 解除爆発音
        player.playSound(MANUAL_HOOKSHOT_CONFIG.RELEASE_SOUND, {
          pitch: MANUAL_HOOKSHOT_CONFIG.RELEASE_SOUND_PITCH,
          volume: MANUAL_HOOKSHOT_CONFIG.RELEASE_SOUND_VOLUME,
        });

        // 木の上などに着地しやすくするための上方向インパルス
        player.applyImpulse({
          x: 0,
          y: MANUAL_HOOKSHOT_CONFIG.RELEASE_UPWARD_IMPULSE,
          z: 0,
        });

        // 解除直後に短い低速落下の効果を与えて落下ダメージをリセット＆安全着地を補助（パーティクル非表示）
        if (MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RELEASE > 0) {
          player.addEffect(
            "slow_falling",
            MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RELEASE,
            {
              showParticles: false,
            },
          );
        }
      } catch {}

      player.sendMessage("§e[Hookshot] フックを解除しました！（ホップ）");

      // 巻き取り終了時の爆発でもメーターを消費
      startManualHookshotBlastCooldown(player);
      updateManualHookshotHud(player);
    } else {
      // クールダウン中は爆風とインパクトなしで解除
      try {
        player.playSound("random.pop", { pitch: 1.2, volume: 0.8 });
      } catch {}
      player.sendMessage("§e[Hookshot] フックを解除しました。");
    }
  } else if (notify) {
    try {
      player.playSound("random.pop", { pitch: 1.2, volume: 0.8 });
    } catch {}
    player.sendMessage("§e[Hookshot] フックを解除しました。状態をリセットしました。");
  }
}

/**
 * フックショット アイテム使用時の処理（即時着弾・解除）
 */
export function handleManualHookshotUse(
  event: ItemUseBeforeEvent,
  cancelCallback: () => void,
): void {
  const item = event.itemStack;
  if (!item || item.typeId !== MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return;

  const player = event.source;
  if (!(player instanceof Player)) return;

  // バニラのアイテム使用動作をキャンセル
  cancelCallback();

  system.run(() => {
    // 既にフックが存在する場合はフックを外してリセット（手動解除 = true）
    if (playerHooks.has(player.id)) {
      resetHook(player, true, true);
      return;
    }

    // 即時レイキャストで着弾判定（弾速無限）
    const blockHit = player.getBlockFromViewDirection({
      maxDistance: MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE,
      includePassableBlocks: false,
      includeLiquidBlocks: false,
    });

    if (!blockHit) {
      try {
        player.playSound("note.bass", { pitch: 0.6, volume: 0.8 });
      } catch {}
      player.sendMessage("§c[Hookshot] 射程内にブロックがありませんでした。");
      return;
    }

    const blockLoc = blockHit.block.location;
    const hitPos: Vector3 = blockHit.faceLocation
      ? {
          x: blockLoc.x + blockHit.faceLocation.x,
          y: blockLoc.y + blockHit.faceLocation.y,
          z: blockLoc.z + blockHit.faceLocation.z,
        }
      : {
          x: blockLoc.x + 0.5,
          y: blockLoc.y + 0.5,
          z: blockLoc.z + 0.5,
        };

    // フックを着弾状態として記録
    playerHooks.set(player.id, {
      hitPos,
      sneakTickCounter: 0,
    });

    try {
      player.dimension.spawnParticle(MANUAL_HOOKSHOT_CONFIG.HIT_PARTICLE, hitPos);
      player.playSound("item.trident.hit", { pitch: 1.2, volume: 1.0 });
    } catch {}

    player.sendMessage(
      `§a[Hookshot] フックが即時着弾しました！ 座標: (${hitPos.x.toFixed(1)}, ${hitPos.y.toFixed(1)}, ${hitPos.z.toFixed(1)})`,
    );
    player.sendMessage("§e[Hookshot] シフト（スニーク）している間、着弾点に向かって巻き取ります。");
  });
}

/**
 * 毎tickの更新ループ（パーティクル描画、シフト巻取りインパルス付与）
 */
export function updateManualHookshots(): void {
  for (const [playerId, hook] of playerHooks.entries()) {
    const player = world.getAllPlayers().find((p) => p.id === playerId);
    if (!player || !player.isValid) {
      playerHooks.delete(playerId);
      continue;
    }

    const dimension = player.dimension;
    const hitPos = hook.hitPos;
    const headPos = player.getHeadLocation();
    // プレイヤーの視界を遮らないよう、目の高さ直下ではなく手元・胸元の位置から伸ばす
    const playerPos: Vector3 = {
      x: headPos.x,
      y: headPos.y - 0.4,
      z: headPos.z,
    };

    const dx = hitPos.x - playerPos.x;
    const dy = hitPos.y - playerPos.y;
    const dz = hitPos.z - playerPos.z;
    const distance = Math.hypot(dx, dy, dz);

    // プレイヤーと着弾点を結ぶ直線パーティクル（ロープ）を描画
    // カメラの目の前（0.8ブロック以内）のパーティクルを省くことで、視界の遮りを完全防止
    if (distance > 0) {
      const stepDist = MANUAL_HOOKSHOT_CONFIG.ROPE_STEP_DISTANCE;
      const count = Math.max(1, Math.floor(distance / stepDist));
      const startIdx = Math.min(count, Math.ceil(0.8 / stepDist));

      for (let i = startIdx; i <= count; i++) {
        const t = i / count;
        try {
          dimension.spawnParticle(MANUAL_HOOKSHOT_CONFIG.ROPE_PARTICLE, {
            x: playerPos.x + dx * t,
            y: playerPos.y + dy * t,
            z: playerPos.z + dz * t,
          });
        } catch {}
      }
    }

    // シフト（スニーク）キー入力中のみ着弾点に向かってインパルスを毎フレーム付与
    if (isSneakButtonPressed(player)) {
      // プレイヤーの現在速度を取得
      let vel = { x: 0, y: 0, z: 0 };
      try {
        vel = player.getVelocity();
      } catch {}

      // 巻き取り開始の瞬間（sneakTickCounter === 0）に下方向の落下速度が規定値以上ならリセット＆爆発エフェクト
      const downwardSpeed = -vel.y;
      if (
        hook.sneakTickCounter === 0 &&
        MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_ON_WIND_START &&
        downwardSpeed >= MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_THRESHOLD
      ) {
        // クールダウン中でなく、爆風が起こせる場合のみ発動（エフェクト、低速落下、y速度リセット）
        if (isManualHookshotBlastReady(player)) {
          try {
            player.applyImpulse({ x: 0, y: -vel.y, z: 0 });

            // 爆発エフェクトとサウンドの発生
            const feetPos = {
              x: player.location.x,
              y: player.location.y + 0.2,
              z: player.location.z,
            };
            player.dimension.spawnParticle(
              MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_PARTICLE,
              feetPos,
            );
            try {
              player.dimension.spawnParticle("minecraft:wind_explosion_emitter", feetPos);
            } catch {}

            player.playSound(MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_SOUND, {
              pitch: MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_SOUND_PITCH,
              volume: MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_SOUND_VOLUME,
            });

            // リセット直後に短い低速落下の効果を与えて落下ダメージをリセット（パーティクル非表示）
            if (MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RESET > 0) {
              player.addEffect(
                "slow_falling",
                MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RESET,
                {
                  showParticles: false,
                },
              );
            }
          } catch {}
          vel.y = 0;

          // 巻き取り開始時の爆風クールダウンを開始
          startManualHookshotBlastCooldown(player);
        }
      }

      if (distance > MANUAL_HOOKSHOT_CONFIG.STOP_DISTANCE) {
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;

        // 下方向の速度（y軸が負の場合）は0として終端速度を計算（落下速度による誤認を防止）
        const evalVelY = Math.max(0, vel.y);
        const speedAlongTarget = vel.x * nx + evalVelY * ny + vel.z * nz;

        const maxSpeed = MANUAL_HOOKSHOT_CONFIG.MAX_WIND_SPEED;
        let effectiveImpulse = 0;

        // 1. 目標と反対方向に移動している場合（落下や吹き飛ばしによる減速・反転フェーズ）:
        //    現在速度が上限値をどれだけ上回っていても、100%の巻き取り力でブレーキ・反転を行います
        if (speedAlongTarget <= 0) {
          effectiveImpulse = MANUAL_HOOKSHOT_CONFIG.PULL_IMPULSE;
        }
        // 2. 目標に向かって移動している場合（加速・巡航フェーズ）:
        //    空気抵抗の釣り合いモデルにより、上限速度に近づくにつれて加速が滑らかに減衰します
        else if (speedAlongTarget < maxSpeed) {
          const ratio = 1 - speedAlongTarget / maxSpeed;
          effectiveImpulse = MANUAL_HOOKSHOT_CONFIG.PULL_IMPULSE * ratio;
        }
        // 3. 既に目標に向かって上限速度以上で移動している場合:
        //    これ以上加速させず、上限速度を維持します (effectiveImpulse = 0)

        if (effectiveImpulse > 0) {
          const impulse = {
            x: nx * effectiveImpulse,
            y:
              ny * effectiveImpulse +
              MANUAL_HOOKSHOT_CONFIG.PULL_VERTICAL_BOOST,
            z: nz * effectiveImpulse,
          };

          try {
            player.applyImpulse(impulse);
          } catch {}
        }

        // デバッグ用 sendMessage (開始時 + 20tick/1秒ごとに通知)
        hook.sneakTickCounter++;
        if (hook.sneakTickCounter === 1 || hook.sneakTickCounter % 20 === 0) {
          player.sendMessage(
            `§b[Hookshot] 巻き取り中... 残り距離: ${distance.toFixed(1)}m | 速度: ${speedAlongTarget.toFixed(2)} b/t`,
          );
        }
      } else {
        // 到達判定
        hook.sneakTickCounter++;
        if (hook.sneakTickCounter === 1 || hook.sneakTickCounter % 20 === 0) {
          player.sendMessage("§a[Hookshot] 目標地点に到達しました。");
        }
      }
    } else {
      // シフトを離している時はカウンタをリセット
      hook.sneakTickCounter = 0;
    }
  }
}

/**
 * 手動巻取り式フックショットのイベントリスナーおよび更新ループを初期化
 */
export function initManualHookshot(): void {
  // アイテム使用イベント
  world.beforeEvents.itemUse.subscribe((event) => {
    handleManualHookshotUse(event, () => {
      event.cancel = true;
    });
  });

  // 毎フレーム（1tick）更新ループ（移動インパルス & アクションバーHUD更新）
  system.runInterval(() => {
    updateManualHookshots();
    for (const player of world.getAllPlayers()) {
      updateManualHookshotHud(player);
    }
  }, 1);

  // プレイヤー死亡時にフック状態およびクールダウンをリセット
  world.afterEvents.entityDie.subscribe((event) => {
    const dead = event.deadEntity;
    if (dead instanceof Player) {
      if (playerHooks.has(dead.id)) {
        resetHook(dead, false);
      }
      blastCooldownMap.delete(dead.id);
    }
  });
}
