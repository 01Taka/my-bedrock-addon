import {
  world,
  system,
  Player,
  ItemUseBeforeEvent,
  Vector3,
  InputButton,
  ButtonState,
  EquipmentSlot,
  Entity,
} from "@minecraft/server";
import { MANUAL_HOOKSHOT_CONFIG } from "./config";
import { isAutoSneakEnabled } from "../settings";
import { isHeavyEntity, isValidHookshotTarget } from "./entities";

/**
 * プレイヤーが物理的にスニーク（シフト）キーを押下しているかを判定
 * （低所・匍匐時の強制スニークによる誤動作を防止、Switch向け常時シフト設定対応）
 */
function isSneakButtonPressed(player: Player): boolean {
  // 常時シフト判定設定がONの場合は常にtrue
  if (isAutoSneakEnabled(player)) {
    return true;
  }
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
 * プレイヤーごとのフック状態（即時着弾のため着弾座標とスニークカウンタ、着弾後経過tickを保持）
 */
interface PlayerHookState {
  hitPos: Vector3;
  targetEntity?: Entity;
  dimensionId: string;
  sneakTickCounter: number;
  /** 初回の巻き取りが開始されたか（巻き取り開始時の落下軽減権利の判定およびピルチャージ開始トリガー） */
  hasStartedWinding: boolean;
  /** 巻き取り開始時からの経過tick数（ピルチャージ用） */
  chargeTicks: number;
}

/** プレイヤーIDをキーにしたフック状態マップ */
const playerHooks = new Map<string, PlayerHookState>();

/** プレイヤーIDをキーにした前回巻き取り開始時爆風エフェクト発生tickマップ */
const lastWindStartEffectTickMap = new Map<string, number>();

/** 前回ピルHUDを表示したプレイヤーIDのセット（非表示時のアクションバー消去用） */
const playersWithPillHud = new Set<string>();

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
 * プレイヤーがマニュアルフックショットをメインハンドに持っているか判定
 */
export function isHoldingManualHookshotInMainhand(player: Player): boolean {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (mainhand?.typeId === MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return true;
    }
  } catch {}
  return false;
}

/**
 * プレイヤーの現在チャージされているピル数を取得（0〜3）
 */
export function getChargedPillCount(player: Player): number {
  const hook = playerHooks.get(player.id);
  if (!hook || !hook.hasStartedWinding) return 0;
  return Math.min(
    MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT,
    Math.floor(
      hook.chargeTicks / MANUAL_HOOKSHOT_CONFIG.PILL_CHARGE_TICKS_PER_PILL,
    ),
  );
}

/**
 * 解除時の爆風＆インパルスが発動可能か（3つのピルが満タンか）判定
 */
export function isReleaseBlastReady(player: Player): boolean {
  return getChargedPillCount(player) >= MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT;
}

/**
 * アクションバーにピルの蓄積状況を示すテキストなしピルUIを表示
 * （手に持っておらず、フックも刺さっていない場合はHUDをクリア）
 */
export function updateManualHookshotHud(player: Player): void {
  if (!player.isValid) return;

  const shouldShow = isHoldingManualHookshot(player) || playerHooks.has(player.id);

  if (shouldShow) {
    playersWithPillHud.add(player.id);
    const hook = playerHooks.get(player.id);

    // 1. 着弾中で、まだ最初の巻き取りが開始されていない場合:
    //    オレンジ色(§6)で「着弾完了・巻き取り開始時の衝撃吸収ブレーキ待機中」を表示
    if (hook && !hook.hasStartedWinding) {
      player.onScreenDisplay.setActionBar("§6(▰▰▰)");
      return;
    }

    // 2. 巻き取り開始後、または未着弾時（構えている状態）のHUD表示
    const pills = getChargedPillCount(player);
    const maxPills = MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT;
    // 着地中で実際には爆発とインパルスが発生しない場合はグレーっぽい薄緑(§2)、空中で発動可能な場合は鮮やかな緑(§a)
    const activeColor = player.isOnGround ? "§2" : "§a";

    // 射程内で壁または大型モブに着弾可能か判定（未着弾時の空ピル色用）
    let canHitTarget = false;
    if (!hook) {
      try {
        const entityHits = player.getEntitiesFromViewDirection({
          maxDistance: MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE,
        });
        for (const hit of entityHits) {
          if (isValidHookshotTarget(player, hit.entity) && isHeavyEntity(hit.entity)) {
            canHitTarget = true;
            break;
          }
        }
        if (!canHitTarget) {
          const blockHit = player.getBlockFromViewDirection({
            maxDistance: MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE,
            includePassableBlocks: false,
            includeLiquidBlocks: false,
          });
          canHitTarget = blockHit !== undefined;
        }
      } catch {}
    }

    // 空ピルの色: 着弾中または射程内で壁/大型モブに当たる時は明るい灰色(§7)、射程外や対象がない時は暗灰色(§8)
    const emptyColor = hook || canHitTarget ? "§7" : "§8";

    if (pills >= maxPills) {
      // 3つ満タン（着地中はグレーっぽい薄緑、空中で発動可能な場合は鮮やかな緑）
      player.onScreenDisplay.setActionBar(`${activeColor}(▰▰▰)`);
    } else if (pills === 0) {
      // 0個（未着弾または巻き取り開始直後）: 射程内で壁に当たる時/着弾中は明るい空ピル、射程外は暗灰色の空ピル
      player.onScreenDisplay.setActionBar(`${emptyColor}(▰▰▰)`);
    } else {
      // 1〜2個: 蓄積数に応じて表現（着地中はグレーっぽい薄緑、空中は鮮やかな緑、空きピルは射程判定を反映）
      const filled = pills;
      const empty = maxPills - filled;
      const pillBar = activeColor + "▰".repeat(filled) + emptyColor + "▰".repeat(empty);
      player.onScreenDisplay.setActionBar(`§7(${pillBar}§7)`);
    }
  } else if (playersWithPillHud.has(player.id)) {
    // 手に持っておらず、かつフックも刺さっていない場合はピルHUDを非表示（クリア）
    playersWithPillHud.delete(player.id);
    try {
      player.onScreenDisplay.setActionBar("");
    } catch {}
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
  const hook = playerHooks.get(player.id);
  if (!hook) return;

  // 解除前のピル蓄積状態（巻き取り開始済みかつピルが3つ満タンか）を確認
  const canReleaseBlast =
    hook.hasStartedWinding &&
    Math.floor(
      hook.chargeTicks / MANUAL_HOOKSHOT_CONFIG.PILL_CHARGE_TICKS_PER_PILL,
    ) >= MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT;

  playerHooks.delete(player.id);

  // 手動解除かつ空中にいる場合のみ判定
  if (isManualRelease && !player.isOnGround) {
    if (canReleaseBlast) {
      // ピルが3つ満タンの場合のみ、小爆発エフェクトとホップインパルスを適用
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
    } else {
      // 3つ溜まっていない場合は爆風・インパルスなしで静かに解除
      try {
        player.playSound("random.pop", { pitch: 1.2, volume: 0.8 });
      } catch {}
    }
  } else if (notify) {
    try {
      player.playSound("random.pop", { pitch: 1.2, volume: 0.8 });
    } catch {}
  }

  // フック解除時、マニュアルフックショットを持っていなければHUDを即座に非表示（クリア）
  if (!isHoldingManualHookshot(player) && playersWithPillHud.has(player.id)) {
    playersWithPillHud.delete(player.id);
    try {
      player.onScreenDisplay.setActionBar("");
    } catch {}
  }
}

/**
 * メインハンドにフックショットを持っていない状態で、着弾地点付近かつ着弾地点の方角を見て
 * インタラクト（右クリック）した際にフックを解除できるか判定・実行
 * @returns フックを解除した場合は true
 */
export function tryDetachHookOnInteract(player: Player): boolean {
  if (!player.isValid) return false;

  // フックが刺さっていない場合は対象外
  const hook = playerHooks.get(player.id);
  if (!hook) return false;

  // メインハンドにフックショットを持っている場合は通常のアイテム使用処理に任せる
  if (isHoldingManualHookshotInMainhand(player)) return false;

  const headPos = player.getHeadLocation();
  const hitPos = hook.hitPos;

  const dx = hitPos.x - headPos.x;
  const dy = hitPos.y - headPos.y;
  const dz = hitPos.z - headPos.z;
  const dist = Math.hypot(dx, dy, dz);

  // 1. 距離判定（着弾地点付近か）
  if (dist > MANUAL_HOOKSHOT_CONFIG.DETACH_REACH_DISTANCE) {
    return false;
  }

  // 2. 方角判定（着弾地点の方角を見ているか）
  // 至近距離（0.5ブロック未満）でない場合は視線と着弾点方向の内積をチェック
  if (dist > 0.5) {
    const viewDir = player.getViewDirection();
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;
    const dot = viewDir.x * nx + viewDir.y * ny + viewDir.z * nz;

    if (dot < MANUAL_HOOKSHOT_CONFIG.DETACH_VIEW_ANGLE_COS) {
      return false;
    }
  }

  // フックを外して状態をリセット（手動解除 = true）
  resetHook(player, true, true);
  return true;
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

    const maxDistance = MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE;
    const playerPos = player.location;

    // 1. 視線方向のエンティティレイキャスト（大型モブ判定）
    const entityHits = player.getEntitiesFromViewDirection({
      maxDistance,
    });
    let closestHeavyEntityHit: { entity: Entity; distance: number } | null = null;
    for (const hit of entityHits) {
      if (isValidHookshotTarget(player, hit.entity) && isHeavyEntity(hit.entity)) {
        closestHeavyEntityHit = hit;
        break; // getEntitiesFromViewDirection は距離順
      }
    }

    // 2. 視線方向のブロックレイキャスト
    const blockHit = player.getBlockFromViewDirection({
      maxDistance,
      includePassableBlocks: false,
      includeLiquidBlocks: false,
    });

    let blockDistance = Number.POSITIVE_INFINITY;
    let blockHitPos: Vector3 | null = null;

    if (blockHit) {
      const blockLoc = blockHit.block.location;
      blockHitPos = blockHit.faceLocation
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
      blockDistance = Math.hypot(
        blockHitPos.x - playerPos.x,
        blockHitPos.y - playerPos.y,
        blockHitPos.z - playerPos.z,
      );
    }

    let hitPos: Vector3 | null = null;
    let targetEntity: Entity | undefined = undefined;

    // 大型モブがブロックより手前にある場合
    if (closestHeavyEntityHit && closestHeavyEntityHit.distance < blockDistance) {
      targetEntity = closestHeavyEntityHit.entity;
      hitPos = targetEntity.getHeadLocation ? targetEntity.getHeadLocation() : targetEntity.location;
    } else if (blockHitPos) {
      hitPos = blockHitPos;
    }

    if (!hitPos) {
      try {
        player.playSound("note.bass", { pitch: 0.6, volume: 0.8 });
      } catch {}
      return;
    }

    // フックを着弾状態として記録
    playerHooks.set(player.id, {
      hitPos,
      targetEntity,
      dimensionId: player.dimension.id,
      sneakTickCounter: 0,
      hasStartedWinding: false,
      chargeTicks: 0,
    });

    try {
      player.dimension.spawnParticle(MANUAL_HOOKSHOT_CONFIG.HIT_PARTICLE, hitPos);
      player.playSound("item.trident.hit", { pitch: 1.2, volume: 1.0 });
    } catch {}
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

    // プレイヤーのディメンションが変わっている場合はフック解除
    if (dimension.id !== hook.dimensionId) {
      resetHook(player, false, false);
      continue;
    }

    // 対象エンティティが存在する場合、その最新座標に追従
    if (hook.targetEntity) {
      if (
        !hook.targetEntity.isValid ||
        hook.targetEntity.dimension.id !== dimension.id
      ) {
        // 対象モブが消滅・死亡・別ディメンションへ移動した場合はフック解除
        resetHook(player, true, false);
        continue;
      }
      try {
        hook.hitPos = hook.targetEntity.getHeadLocation
          ? hook.targetEntity.getHeadLocation()
          : hook.targetEntity.location;
      } catch {
        resetHook(player, true, false);
        continue;
      }
    }

    const hitPos = hook.hitPos;
    const headPos = player.getHeadLocation();

    // 初回巻き取りが開始された後のみ経過tickをカウント（ピルチャージ用）
    if (hook.hasStartedWinding) {
      hook.chargeTicks++;
    }

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

      // 最初の一回目の巻き取り開始時のみ判定（1回の着弾につき1回のみ発動可能）
      if (!hook.hasStartedWinding) {
        hook.hasStartedWinding = true;

        const downwardSpeed = -vel.y;
        if (
          MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_ON_WIND_START &&
          downwardSpeed >= MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_THRESHOLD
        ) {
          try {
            player.applyImpulse({ x: 0, y: -vel.y, z: 0 });

            // 爆風エフェクトと音のインターバル判定（約1秒間は再度エフェクト・サウンドを出さない）
            const lastEffectTick = lastWindStartEffectTickMap.get(player.id) ?? -9999;
            if (
              system.currentTick - lastEffectTick >=
              MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_INTERVAL_TICKS
            ) {
              lastWindStartEffectTickMap.set(player.id, system.currentTick);

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
            }

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
        }
      }

      const stopDistance = hook.targetEntity
        ? Math.max(MANUAL_HOOKSHOT_CONFIG.STOP_DISTANCE, 2.5)
        : MANUAL_HOOKSHOT_CONFIG.STOP_DISTANCE;

      if (distance > stopDistance) {
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

        hook.sneakTickCounter++;
      } else {
        // 到達判定
        hook.sneakTickCounter++;
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
  // アイテム使用イベント（フックショット使用、および他アイテム所持時の着弾点インタラクト解除）
  world.beforeEvents.itemUse.subscribe((event) => {
    // フックショット自体の使用処理
    handleManualHookshotUse(event, () => {
      event.cancel = true;
    });

    // フックショット以外のアイテムを持って着弾点付近を見て使用した場合の手動解除
    if (event.source instanceof Player) {
      if (tryDetachHookOnInteract(event.source)) {
        event.cancel = true;
      }
    }
  });

  // ブロックインタラクトイベント（素手または他アイテムで着弾点付近を右クリックした際のフック解除）
  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (tryDetachHookOnInteract(event.player)) {
      event.cancel = true;
    }
  });

  // エンティティインタラクトイベント（着弾した大型モブ等付近を右クリックした際のフック解除）
  world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (tryDetachHookOnInteract(event.player)) {
      event.cancel = true;
    }
  });

  // 毎フレーム（1tick）更新ループ（移動インパルス & アクションバーHUD更新）
  system.runInterval(() => {
    updateManualHookshots();
    for (const player of world.getAllPlayers()) {
      updateManualHookshotHud(player);
    }
  }, 1);

  // プレイヤー死亡時にフック状態およびエフェクトタイマー、HUD状態をリセット
  world.afterEvents.entityDie.subscribe((event) => {
    const dead = event.deadEntity;
    if (dead instanceof Player) {
      if (playerHooks.has(dead.id)) {
        resetHook(dead, false, false);
      }
      lastWindStartEffectTickMap.delete(dead.id);
      playersWithPillHud.delete(dead.id);
    }
  });

  // ディメンション変更時（ネザー/エンドポータル通過やテレポート時など）にフックを解除
  world.afterEvents.playerDimensionChange.subscribe((event) => {
    const player = event.player;
    if (player && player.isValid) {
      if (playerHooks.has(player.id)) {
        resetHook(player, false, false);
      }
      lastWindStartEffectTickMap.delete(player.id);
      playersWithPillHud.delete(player.id);
    }
  });

  // リスポーン時・スポーン時にフック状態を確実にクリーンアップ
  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    if (player && player.isValid) {
      if (playerHooks.has(player.id)) {
        resetHook(player, false, false);
      }
      lastWindStartEffectTickMap.delete(player.id);
      playersWithPillHud.delete(player.id);
    }
  });

  // プレイヤー退出時
  world.beforeEvents.playerLeave.subscribe((event) => {
    const player = event.player;
    if (player) {
      playerHooks.delete(player.id);
      lastWindStartEffectTickMap.delete(player.id);
      playersWithPillHud.delete(player.id);
    }
  });
}
