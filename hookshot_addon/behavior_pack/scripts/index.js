// src/index.ts
import {
  world as world3,
  system as system6,
  InputButton as InputButton3,
  ButtonState as ButtonState3
} from "@minecraft/server";

// src/hookshot/index.ts
import {
  Player as Player4,
  system as system3
} from "@minecraft/server";

// src/hookshot/config.ts
var HOOKSHOT_ITEM_ID = "addon:hookshot";
var PLAYER_MOVEMENT_CONFIG = {
  /** 着弾可能な最大距離（ブロック単位） */
  MAX_DISTANCE: 150,
  /** インパルス強度の最大値（ブロック換算。何ブロック分の距離の勢いを最大とするか） */
  MAX_IMPULSE_DISTANCE: 40,
  /** 横方向の重み（横方向の距離に対して加えるインパルス強度の係数） */
  HORIZONTAL_WEIGHT: 0.1,
  /** 縦方向の重み（縦方向の距離に対して加えるインパルス強度の係数） */
  VERTICAL_WEIGHT: 0.07,
  /** 高さオフセット（着弾地点の何マス上を目標とするか） */
  HEIGHT_OFFSET: 20,
  /** プレイヤーの横入力による偏向回転角度（最大角度、度数法） */
  STEERING_ANGLE_DEGREES: 20,
  /** プレイヤーの後退入力による減速加算インパルスの重み */
  DISTANCE_DAMPING_WEIGHT: 0.3,
  /** プレイヤーの前進入力による加速加算インパルスの重み */
  DISTANCE_BOOST_WEIGHT: 1
};
var ENTITY_PULL_CONFIG = {
  /** 横方向の引き寄せインパルス係数 */
  HORIZONTAL_WEIGHT: 0.25,
  /** Y座標差が閾値以下のときの基本垂直インパルス（一定値） */
  BASE_VERTICAL_IMPULSE: 0.4,
  /** 高低差に応じた垂直インパルス加算を開始するY座標差の閾値（ブロック単位） */
  HEIGHT_DIFF_THRESHOLD: 0.1,
  /** 高低差が閾値を超えた場合に加算する垂直インパルス係数（1ブロックあたり） */
  HEIGHT_DIFF_VERTICAL_WEIGHT: 0.3,
  /** 最大インパルス強度（過度な吹っ飛び防止） */
  MAX_IMPULSE_SPEED: 2.5,
  /** プレイヤー手前で止めるためのオフセット距離（ブロック単位） */
  STOP_OFFSET_DISTANCE: 1,
  /** 引き寄せ時のサウンドID */
  SOUND_ID: "item.trident.return",
  /** 引き寄せ時のサウンド音量 */
  SOUND_VOLUME: 1,
  /** 引き寄せ時のサウンドピッチ */
  SOUND_PITCH: 1.2
};
var HEAVY_ENTITY_TYPES = [
  "minecraft:iron_golem",
  "minecraft:warden",
  "minecraft:ender_dragon",
  "minecraft:wither",
  "minecraft:elder_guardian",
  "minecraft:ravager",
  "minecraft:ghast"
];
var EXCLUDED_ENTITY_TYPES = [
  "minecraft:item",
  "minecraft:arrow",
  "minecraft:xp_orb",
  "minecraft:splash_potion",
  "minecraft:lingering_potion",
  "minecraft:egg",
  "minecraft:snowball",
  "minecraft:ender_pearl",
  "minecraft:boat",
  "minecraft:chest_boat",
  "minecraft:minecart",
  "minecraft:chest_minecart",
  "minecraft:command_block_minecart",
  "minecraft:furnace_minecart",
  "minecraft:hopper_minecart",
  "minecraft:tnt_minecart",
  "minecraft:armor_stand"
];
var HOOKSHOT_PARTICLE_CONFIG = {
  /** 軌道パーティクルのID（エンドロッド光線ビーム） */
  TRAIL_PARTICLE: "minecraft:endrod",
  /** 命中時パーティクルのID */
  HIT_PARTICLE: "minecraft:endrod",
  /** 軌道パーティクルの配置間隔（ブロック単位） */
  STEP_DISTANCE: 0.25,
  /** 空振り時のパーティクル描画最大距離 */
  MISS_DISTANCE: 30
};
var HOOKSHOT_BLAST_CONFIG = {
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 上方向インパルス強度 */
  PRE_HOOK_UPWARD_IMPULSE: 0.8,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  PRE_HOOK_DOWNWARD_INERTIA_RETENTION: 0.3,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  PRE_HOOK_HORIZONTAL_INPUT_WEIGHT: 0.75,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 最大速度制限 */
  PRE_HOOK_MAX_IMPULSE_SPEED: 2.5,
  /** フックショット着弾後の爆風ジャンプ: 上方向インパルス強度 */
  POST_HOOK_UPWARD_IMPULSE: 1.2,
  /** フックショット着弾後の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  POST_HOOK_DOWNWARD_INERTIA_RETENTION: 0.3,
  /** フックショット着弾後の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  POST_HOOK_HORIZONTAL_INPUT_WEIGHT: 0.1,
  /** フックショット着弾後の爆風ジャンプ: 最大速度制限 */
  POST_HOOK_MAX_IMPULSE_SPEED: 3,
  /** 平行入力3段階（前・入力なし・後ろ）ごとの方向別挙動設定 */
  DIRECTIONAL: {
    /** 前入力時（低め・前進維持） */
    FORWARD: {
      /** 水平速度維持率（0.8 = 80%に減衰） */
      HORIZONTAL_RETENTION: 0.8,
      /** 下方向(落下)勢い維持率（0.4 = 40%維持） */
      DOWNWARD_RETENTION: 0.4,
      /** 上方向(上昇)勢い維持率（0.4 = 40%維持） */
      UPWARD_RETENTION: 0.4,
      /** 追加上方向インパルス強度 */
      UPWARD_IMPULSE: 0.8,
      /** 追加水平方向インパルス強度（進行方向を正、逆方向を負とする） */
      HORIZONTAL_IMPULSE: 0.6
    },
    /** 入力なし時（通常上昇ジャンプ） */
    NEUTRAL: {
      /** 水平速度維持率（0.4 = 40%に減衰） */
      HORIZONTAL_RETENTION: 0.4,
      /** 下方向(落下)勢い維持率（0.0 = 0にして完全相殺） */
      DOWNWARD_RETENTION: 0,
      /** 上方向(上昇)勢い維持率（0.6 = 60%維持） */
      UPWARD_RETENTION: 0.6,
      /** 追加上方向インパルス強度 */
      UPWARD_IMPULSE: 1.2,
      /** 追加水平方向インパルス強度（進行方向を正、逆方向を負とする） */
      HORIZONTAL_IMPULSE: 0
    },
    /** 後ろ入力時（反転バックジャンプ） */
    BACKWARD: {
      /** 水平速度維持率（0.0 = 完全に勢いを無くす） */
      HORIZONTAL_RETENTION: 0,
      /** 下方向(落下)勢い維持率（0.0 = 0にして完全相殺） */
      DOWNWARD_RETENTION: 0,
      /** 上方向(上昇)勢い維持率（0.6 = 60%維持） */
      UPWARD_RETENTION: 0.6,
      /** 追加上方向インパルス強度 */
      UPWARD_IMPULSE: 1.2,
      /** 追加水平方向インパルス強度（進行方向を正、逆方向を負とする: -0.6で反転方向へ付与） */
      HORIZONTAL_IMPULSE: -0.8
    }
  },
  /** 静止状態での前入力時に与える水平推進インパルス強度 */
  FORWARD_IMPULSE_FORCE: 0.5,
  /** 平行入力判定のデッドゾーンしきい値（スティック誤差許容） */
  PARALLEL_DEADZONE: 0.2,
  /** 爆風パーティクルID（大爆発） */
  PARTICLE_ID: "minecraft:huge_explosion_emitter",
  /** 風爆発パーティクルID */
  WIND_PARTICLE_ID: "minecraft:wind_explosion_emitter",
  /** 煙爆発パーティクルID */
  SMOKE_PARTICLE_ID: "minecraft:explosion_particle",
  /** 爆風サウンドID */
  SOUND_ID: "random.explode",
  /** 爆風サウンド音量 */
  SOUND_VOLUME: 1,
  /** 爆風サウンドピッチ */
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
  /** 爆風ジャンプ発動時のY座標以下に到達してからの落下ダメージ無効化時間（tick単位: 40tick = 2秒） */
  FALL_DAMAGE_IMMUNITY_TICKS: 40,
  /** 落下ダメージ無効化のカウントダウン開始Yオフセット（発動地点Y - この値 以下でカウントダウン開始。デフォルト: 3） */
  IMMUNITY_TRIGGER_Y_OFFSET: 3,
  /** 落下ダメージ無効化終了時の通知パーティクルID */
  IMMUNITY_EXPIRE_PARTICLE: "minecraft:smoke_particle",
  /** 落下ダメージ無効化終了時の通知サウンドID */
  IMMUNITY_EXPIRE_SOUND: "random.break",
  /** 落下ダメージ無効化終了時のサウンド音量 */
  IMMUNITY_EXPIRE_SOUND_VOLUME: 0.8,
  /** 落下ダメージ無効化終了時のサウンドピッチ */
  IMMUNITY_EXPIRE_SOUND_PITCH: 0.8
};

// src/hookshot/player-movement.ts
function getPlayerMovementInput(player) {
  try {
    if (player.inputInfo) {
      const moveVec = player.inputInfo.getMovementVector();
      if (moveVec) {
        return { x: -moveVec.x, y: moveVec.y };
      }
    }
  } catch (e) {
  }
  return { x: 0, y: 0 };
}
function applyPlayerMovementImpulse(player, targetLocation, config = PLAYER_MOVEMENT_CONFIG) {
  const playerPos = player.location;
  const deltaX = targetLocation.x - playerPos.x;
  const deltaY = targetLocation.y - playerPos.y;
  const deltaZ = targetLocation.z - playerPos.z;
  const launchDistHoriz = Math.hypot(deltaX, deltaZ);
  const uLaunchX = launchDistHoriz > 1e-4 ? deltaX / launchDistHoriz : 0;
  const uLaunchZ = launchDistHoriz > 1e-4 ? deltaZ / launchDistHoriz : 0;
  const moveInput = getPlayerMovementInput(player);
  const viewDir = player.getViewDirection();
  const viewDistHoriz = Math.hypot(viewDir.x, viewDir.z);
  const viewFwdX = viewDistHoriz > 1e-4 ? viewDir.x / viewDistHoriz : 0;
  const viewFwdZ = viewDistHoriz > 1e-4 ? viewDir.z / viewDistHoriz : 0;
  const rightX = -viewFwdZ;
  const rightZ = viewFwdX;
  const inputWorldX = moveInput.y * viewFwdX + moveInput.x * rightX;
  const inputWorldZ = moveInput.y * viewFwdZ + moveInput.x * rightZ;
  const parallelInput = inputWorldX * uLaunchX + inputWorldZ * uLaunchZ;
  const uLaunchRightX = -uLaunchZ;
  const uLaunchRightZ = uLaunchX;
  const steerInput = inputWorldX * uLaunchRightX + inputWorldZ * uLaunchRightZ;
  let parallelAdd = 0;
  if (parallelInput > 0) {
    parallelAdd = parallelInput * config.DISTANCE_BOOST_WEIGHT;
  } else if (parallelInput < 0) {
    parallelAdd = parallelInput * config.DISTANCE_DAMPING_WEIGHT;
  }
  const parallelAddX = parallelAdd * uLaunchX;
  const parallelAddZ = parallelAdd * uLaunchZ;
  const baseHorizX = deltaX * config.HORIZONTAL_WEIGHT + parallelAddX;
  const baseHorizZ = deltaZ * config.HORIZONTAL_WEIGHT + parallelAddZ;
  const maxSteerAngleRad = (config.STEERING_ANGLE_DEGREES ?? 30) * Math.PI / 180;
  const steerAngle = steerInput * maxSteerAngleRad;
  const cos = Math.cos(steerAngle);
  const sin = Math.sin(steerAngle);
  let impulseX = baseHorizX * cos - baseHorizZ * sin;
  let impulseY = deltaY * config.VERTICAL_WEIGHT;
  let impulseZ = baseHorizX * sin + baseHorizZ * cos;
  if (config.MAX_IMPULSE_DISTANCE > 0) {
    const maxImpulseSpeed = config.MAX_IMPULSE_DISTANCE * config.HORIZONTAL_WEIGHT;
    const currentSpeed = Math.hypot(impulseX, impulseY, impulseZ);
    if (currentSpeed > maxImpulseSpeed && currentSpeed > 1e-4) {
      const scale = maxImpulseSpeed / currentSpeed;
      impulseX *= scale;
      impulseY *= scale;
      impulseZ *= scale;
    }
  }
  player.applyImpulse({
    x: impulseX,
    y: impulseY,
    z: impulseZ
  });
  player.playSound("item.trident.riptide_1", { pitch: 1.2, volume: 1 });
  return true;
}
function executePlayerMovementToBlock(player, hitPos, config = PLAYER_MOVEMENT_CONFIG) {
  const targetLocation = {
    x: hitPos.x,
    y: hitPos.y + config.HEIGHT_OFFSET,
    z: hitPos.z
  };
  return applyPlayerMovementImpulse(player, targetLocation, config);
}
function executePlayerMovementToEntity(player, targetEntity, config = PLAYER_MOVEMENT_CONFIG) {
  const entityLoc = targetEntity.location;
  const targetLocation = {
    x: entityLoc.x,
    y: entityLoc.y + config.HEIGHT_OFFSET,
    z: entityLoc.z
  };
  return applyPlayerMovementImpulse(player, targetLocation, config);
}

// src/hookshot/entity-pull.ts
import { system } from "@minecraft/server";
function isHeavyEntity(entity) {
  return HEAVY_ENTITY_TYPES.includes(entity.typeId);
}
function isValidHookshotTarget(player, entity) {
  if (entity.id === player.id) return false;
  if (!entity.isValid) return false;
  if (EXCLUDED_ENTITY_TYPES.includes(entity.typeId)) return false;
  return true;
}
function executeEntityPull(player, targetEntity, config = ENTITY_PULL_CONFIG) {
  if (!targetEntity.isValid) return false;
  const playerPos = player.location;
  const entityPos = targetEntity.location;
  const viewDir = player.getViewDirection();
  const targetX = playerPos.x + viewDir.x * config.STOP_OFFSET_DISTANCE;
  const targetY = playerPos.y;
  const targetZ = playerPos.z + viewDir.z * config.STOP_OFFSET_DISTANCE;
  const deltaX = targetX - entityPos.x;
  const deltaY = targetY - entityPos.y;
  const deltaZ = targetZ - entityPos.z;
  const diffY = playerPos.y - entityPos.y;
  let impulseX = deltaX * config.HORIZONTAL_WEIGHT;
  let impulseY = config.BASE_VERTICAL_IMPULSE;
  if (diffY > config.HEIGHT_DIFF_THRESHOLD) {
    impulseY += (diffY - config.HEIGHT_DIFF_THRESHOLD) * config.HEIGHT_DIFF_VERTICAL_WEIGHT;
  }
  let impulseZ = deltaZ * config.HORIZONTAL_WEIGHT;
  const speed = Math.hypot(impulseX, impulseY, impulseZ);
  if (speed > config.MAX_IMPULSE_SPEED && speed > 1e-4) {
    const scale = config.MAX_IMPULSE_SPEED / speed;
    impulseX *= scale;
    impulseY *= scale;
    impulseZ *= scale;
  }
  targetEntity.applyImpulse({
    x: impulseX,
    y: impulseY,
    z: impulseZ
  });
  player.playSound(config.SOUND_ID, {
    volume: config.SOUND_VOLUME,
    pitch: config.SOUND_PITCH
  });
  try {
    const tag = HOOKSHOT_BLAST_CONFIG.PULLED_TAG;
    targetEntity.addTag(tag);
    system.runTimeout(() => {
      try {
        if (targetEntity.isValid && targetEntity.hasTag(tag)) {
          targetEntity.removeTag(tag);
        }
      } catch {
      }
    }, HOOKSHOT_BLAST_CONFIG.PULL_TAG_DURATION_TICKS);
  } catch {
  }
  return true;
}

// src/hookshot/blast-jump.ts
import {
  Player as Player2,
  EquipmentSlot,
  InputButton,
  ButtonState,
  EntityDamageCause,
  system as system2
} from "@minecraft/server";
var blastJumpStateMap = /* @__PURE__ */ new Map();
var jumpButtonReleasedInAirMap = /* @__PURE__ */ new Map();
var hookshotLandedInAirMap = /* @__PURE__ */ new Map();
var fallDamageImmunityMap = /* @__PURE__ */ new Map();
function isFallDamageImmune(player) {
  return fallDamageImmunityMap.has(player.id);
}
function startFallDamageImmunity(player, config = HOOKSHOT_BLAST_CONFIG) {
  fallDamageImmunityMap.set(player.id, {
    startY: player.location.y,
    remainingTicks: config.FALL_DAMAGE_IMMUNITY_TICKS,
    elapsedTicks: 0,
    groundTicks: 0
  });
}
function clearFallDamageImmunity(player) {
  fallDamageImmunityMap.delete(player.id);
}
function updateFallDamageImmunity(player, deltaTicks = 2, config = HOOKSHOT_BLAST_CONFIG) {
  const state = fallDamageImmunityMap.get(player.id);
  if (!state) return;
  state.elapsedTicks += deltaTicks;
  if (player.isOnGround) {
    if (state.elapsedTicks > 4) {
      state.groundTicks += deltaTicks;
      if (state.groundTicks >= 4) {
        clearFallDamageImmunity(player);
        return;
      }
    }
    return;
  } else {
    state.groundTicks = 0;
  }
  const triggerY = state.startY - config.IMMUNITY_TRIGGER_Y_OFFSET;
  if (player.location.y <= triggerY) {
    state.remainingTicks -= deltaTicks;
    if (state.remainingTicks <= 0) {
      clearFallDamageImmunity(player);
      try {
        const headPos = player.getHeadLocation();
        const offsets = [
          { x: 0, y: 0, z: 0 },
          { x: 0.25, y: -0.2, z: 0.25 },
          { x: -0.25, y: -0.2, z: -0.25 },
          { x: 0.25, y: -0.2, z: -0.25 },
          { x: -0.25, y: -0.2, z: 0.25 }
        ];
        for (const off of offsets) {
          player.dimension.spawnParticle(config.IMMUNITY_EXPIRE_PARTICLE, {
            x: headPos.x + off.x,
            y: headPos.y + off.y,
            z: headPos.z + off.z
          });
        }
        player.playSound(config.IMMUNITY_EXPIRE_SOUND, {
          volume: config.IMMUNITY_EXPIRE_SOUND_VOLUME,
          pitch: config.IMMUNITY_EXPIRE_SOUND_PITCH
        });
      } catch {
      }
    }
  }
}
function handleBlastJumpDamage(event) {
  if (!(event.hurtEntity instanceof Player2)) return;
  const player = event.hurtEntity;
  const cause = event.damageSource.cause;
  if (cause === EntityDamageCause.fall) {
    if (isFallDamageImmune(player)) {
      event.cancel = true;
      event.damage = 0;
      system2.run(() => {
        if (player.isValid) {
          clearFallDamageImmunity(player);
        }
      });
    }
  }
}
function isHoldingHookshot(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      return mainhand?.typeId === HOOKSHOT_ITEM_ID;
    }
  } catch {
  }
  return false;
}
function isBlastJumpReady(player) {
  if (!blastJumpStateMap.has(player.id)) {
    return true;
  }
  return blastJumpStateMap.get(player.id) === true;
}
function resetBlastJump(player) {
  if (!blastJumpStateMap.has(player.id) || blastJumpStateMap.get(player.id) === false) {
    blastJumpStateMap.set(player.id, true);
  }
}
function consumeBlastJump(player) {
  blastJumpStateMap.set(player.id, false);
}
function setJumpButtonReleasedInAir(player, released) {
  jumpButtonReleasedInAirMap.set(player.id, released);
}
function setHookshotLandedInAir(player, landed) {
  hookshotLandedInAirMap.set(player.id, landed);
}
function isHookshotLandedInAir(player) {
  return hookshotLandedInAirMap.get(player.id) === true;
}
function handlePlayerGroundTouch(player) {
  resetBlastJump(player);
  setHookshotLandedInAir(player, false);
  setJumpButtonReleasedInAir(player, false);
}
function handleBlastJumpButtonInput(event) {
  if (event.button !== InputButton.Jump) return;
  const player = event.player;
  if (!player.isValid) return;
  if (event.newButtonState === ButtonState.Released) {
    if (!player.isOnGround) {
      setJumpButtonReleasedInAir(player, true);
    }
    return;
  }
  if (event.newButtonState === ButtonState.Pressed) {
    if (player.isOnGround) {
      setJumpButtonReleasedInAir(player, false);
    } else {
      if (jumpButtonReleasedInAirMap.get(player.id) !== true) {
        return;
      }
      executeBlastJump(player);
    }
  }
}
function executeBlastJump(player, config = HOOKSHOT_BLAST_CONFIG) {
  if (!player.isValid) return false;
  if (!isHoldingHookshot(player)) return false;
  if (player.isOnGround) return false;
  if (jumpButtonReleasedInAirMap.get(player.id) !== true) return false;
  if (!isBlastJumpReady(player)) return false;
  consumeBlastJump(player);
  setJumpButtonReleasedInAir(player, false);
  const isPostHook = hookshotLandedInAirMap.get(player.id) === true;
  const inputWeight = isPostHook ? config.POST_HOOK_HORIZONTAL_INPUT_WEIGHT : config.PRE_HOOK_HORIZONTAL_INPUT_WEIGHT;
  const maxSpeed = isPostHook ? config.POST_HOOK_MAX_IMPULSE_SPEED : config.PRE_HOOK_MAX_IMPULSE_SPEED;
  const moveInput = getPlayerMovementInput(player);
  const viewDir = player.getViewDirection();
  const viewDistHoriz = Math.hypot(viewDir.x, viewDir.z);
  const viewFwdX = viewDistHoriz > 1e-4 ? viewDir.x / viewDistHoriz : 0;
  const viewFwdZ = viewDistHoriz > 1e-4 ? viewDir.z / viewDistHoriz : 0;
  const rightX = -viewFwdZ;
  const rightZ = viewFwdX;
  const inputWorldX = moveInput.y * viewFwdX + moveInput.x * rightX;
  const inputWorldZ = moveInput.y * viewFwdZ + moveInput.x * rightZ;
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
  }
  const currentHorizSpeed = Math.hypot(currentX, currentZ);
  let uDirX = viewFwdX;
  let uDirZ = viewFwdZ;
  const isMoving = currentHorizSpeed > 0.05;
  if (isMoving) {
    uDirX = currentX / currentHorizSpeed;
    uDirZ = currentZ / currentHorizSpeed;
  }
  const parallelInput = inputWorldX * uDirX + inputWorldZ * uDirZ;
  const perpInputX = inputWorldX - parallelInput * uDirX;
  const perpInputZ = inputWorldZ - parallelInput * uDirZ;
  const steerImpulseX = perpInputX * inputWeight;
  const steerImpulseZ = perpInputZ * inputWeight;
  const deadzone = config.PARALLEL_DEADZONE ?? 0.2;
  const isForward = parallelInput > deadzone;
  const isBackward = parallelInput < -deadzone;
  const dirConfig = isForward ? config.DIRECTIONAL.FORWARD : isBackward ? config.DIRECTIONAL.BACKWARD : config.DIRECTIONAL.NEUTRAL;
  const actualRetentionRate = dirConfig.HORIZONTAL_RETENTION;
  let dampingImpulseY = 0;
  if (currentY < 0) {
    dampingImpulseY = currentY * (dirConfig.DOWNWARD_RETENTION - 1);
  } else {
    dampingImpulseY = currentY * (dirConfig.UPWARD_RETENTION - 1);
  }
  const upwardImpulse = dirConfig.UPWARD_IMPULSE;
  let extraParallelImpulseX = 0;
  let extraParallelImpulseZ = 0;
  if (dirConfig.HORIZONTAL_IMPULSE !== 0) {
    extraParallelImpulseX = uDirX * dirConfig.HORIZONTAL_IMPULSE;
    extraParallelImpulseZ = uDirZ * dirConfig.HORIZONTAL_IMPULSE;
  } else if (!isMoving && isForward) {
    extraParallelImpulseX = uDirX * (config.FORWARD_IMPULSE_FORCE ?? 0.5);
    extraParallelImpulseZ = uDirZ * (config.FORWARD_IMPULSE_FORCE ?? 0.5);
  }
  let addedImpulseX = steerImpulseX + extraParallelImpulseX;
  let addedImpulseZ = steerImpulseZ + extraParallelImpulseZ;
  const inputSpeed = Math.hypot(addedImpulseX, addedImpulseZ);
  if (inputSpeed > maxSpeed && inputSpeed > 1e-4) {
    const scale = maxSpeed / inputSpeed;
    addedImpulseX *= scale;
    addedImpulseZ *= scale;
  }
  const retention = Math.max(0, actualRetentionRate);
  const dampingImpulseX = (retention - 1) * currentX;
  const dampingImpulseZ = (retention - 1) * currentZ;
  player.applyImpulse({
    x: dampingImpulseX,
    y: dampingImpulseY,
    z: dampingImpulseZ
  });
  player.applyImpulse({
    x: addedImpulseX,
    y: upwardImpulse,
    z: addedImpulseZ
  });
  startFallDamageImmunity(player, config);
  try {
    const feetPos = {
      x: player.location.x,
      y: player.location.y,
      z: player.location.z
    };
    if (config.PARTICLE_ID) {
      player.dimension.spawnParticle(config.PARTICLE_ID, feetPos);
    }
    if (config.WIND_PARTICLE_ID) {
      player.dimension.spawnParticle(config.WIND_PARTICLE_ID, feetPos);
    }
    if (config.SMOKE_PARTICLE_ID) {
      player.dimension.spawnParticle(config.SMOKE_PARTICLE_ID, feetPos);
      player.dimension.spawnParticle(config.SMOKE_PARTICLE_ID, {
        x: feetPos.x + 0.2,
        y: feetPos.y,
        z: feetPos.z + 0.2
      });
      player.dimension.spawnParticle(config.SMOKE_PARTICLE_ID, {
        x: feetPos.x - 0.2,
        y: feetPos.y,
        z: feetPos.z - 0.2
      });
    }
    if (config.SOUND_ID) {
      player.playSound(config.SOUND_ID, {
        volume: config.SOUND_VOLUME,
        pitch: isPostHook ? 1.4 : config.SOUND_PITCH
      });
    }
    player.playSound("breeze.wind_charge.burst", {
      volume: 0.9,
      pitch: isPostHook ? 1.3 : 1.1
    });
  } catch {
  }
  updateBlastHud(player);
  return true;
}
function updateBlastHud(player) {
  if (!player.isValid) return;
  if (isHoldingHookshot(player)) {
    const ready = isBlastJumpReady(player);
    player.onScreenDisplay.setActionBar(
      ready ? "\xA7a\u2726 BLAST READY\xA7r" : "\xA77\u2727 BLAST USED\xA7r"
    );
  }
}

// src/hookshot/combat.ts
import {
  Player as Player3,
  EntityDamageCause as EntityDamageCause2
} from "@minecraft/server";
function handleHookshotEntityHit(event, config = HOOKSHOT_BLAST_CONFIG) {
  const damagingEntity = event.damagingEntity;
  const hitEntity = event.hitEntity;
  if (!(damagingEntity instanceof Player3)) return false;
  if (!isHoldingHookshot(damagingEntity)) return false;
  if (!hitEntity.isValid || !hitEntity.hasTag(config.PULLED_TAG)) return false;
  try {
    hitEntity.removeTag(config.PULLED_TAG);
  } catch {
  }
  try {
    hitEntity.applyDamage(config.FINISHER_DAMAGE, {
      damagingEntity,
      cause: EntityDamageCause2.entityAttack
    });
  } catch {
  }
  const viewDir = damagingEntity.getViewDirection();
  const viewDistHoriz = Math.hypot(viewDir.x, viewDir.z);
  const fwdX = viewDistHoriz > 1e-4 ? viewDir.x / viewDistHoriz : 0;
  const fwdZ = viewDistHoriz > 1e-4 ? viewDir.z / viewDistHoriz : 0;
  const impulseX = fwdX * config.FINISHER_KNOCKBACK_FORCE;
  const impulseY = config.FINISHER_VERTICAL_LIFT;
  const impulseZ = fwdZ * config.FINISHER_KNOCKBACK_FORCE;
  try {
    hitEntity.applyImpulse({
      x: impulseX,
      y: impulseY,
      z: impulseZ
    });
  } catch {
  }
  try {
    const targetLoc = hitEntity.location;
    const effectPos = {
      x: targetLoc.x,
      y: targetLoc.y + 0.5,
      z: targetLoc.z
    };
    damagingEntity.dimension.spawnParticle(config.PARTICLE_ID, effectPos);
    damagingEntity.playSound(config.SOUND_ID, {
      volume: config.SOUND_VOLUME,
      pitch: 0.9
    });
  } catch {
  }
  return true;
}

// src/hookshot/index.ts
function spawnHookshotTrail(dimension, start, end, config = HOOKSHOT_PARTICLE_CONFIG) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const dz = end.z - start.z;
  const distance = Math.hypot(dx, dy, dz);
  if (distance <= 0) return;
  const count = Math.max(1, Math.floor(distance / config.STEP_DISTANCE));
  const stepX = dx / count;
  const stepY = dy / count;
  const stepZ = dz / count;
  for (let i = 0; i <= count; i++) {
    const px = start.x + stepX * i;
    const py = start.y + stepY * i;
    const pz = start.z + stepZ * i;
    try {
      dimension.spawnParticle(config.TRAIL_PARTICLE, {
        x: px,
        y: py,
        z: pz
      });
    } catch {
    }
  }
}
function spawnHookshotImpact(dimension, hitPos, config = HOOKSHOT_PARTICLE_CONFIG) {
  const offsets = [
    { x: 0, y: 0, z: 0 },
    { x: 0.15, y: 0.15, z: 0 },
    { x: -0.15, y: 0.15, z: 0 },
    { x: 0, y: 0.15, z: 0.15 },
    { x: 0, y: 0.15, z: -0.15 }
  ];
  for (const offset of offsets) {
    try {
      dimension.spawnParticle(config.HIT_PARTICLE, {
        x: hitPos.x + offset.x,
        y: hitPos.y + offset.y,
        z: hitPos.z + offset.z
      });
    } catch {
    }
  }
}
function handleHookshotUse(event, cancelCallback) {
  const item = event.itemStack;
  if (!item || item.typeId !== HOOKSHOT_ITEM_ID) return;
  const player = event.source;
  if (!(player instanceof Player4)) return;
  cancelCallback();
  const isSneaking = player.isSneaking;
  if (!player.isOnGround && isHookshotLandedInAir(player) && isBlastJumpReady(player)) {
    system3.run(() => {
      executeBlastJump(player);
    });
    return;
  }
  system3.run(() => {
    executeHookshot(player, isSneaking);
  });
}
function executeHookshot(player, isSneaking = player.isSneaking) {
  const maxDistance = PLAYER_MOVEMENT_CONFIG.MAX_DISTANCE;
  const playerPos = player.location;
  const headPos = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  const startPos = {
    x: headPos.x + viewDir.x * 0.4,
    y: headPos.y + viewDir.y * 0.4 - 0.1,
    z: headPos.z + viewDir.z * 0.4
  };
  const entityHits = player.getEntitiesFromViewDirection({
    maxDistance
  });
  let closestEntityHit = null;
  for (const hit of entityHits) {
    if (isValidHookshotTarget(player, hit.entity)) {
      closestEntityHit = hit;
      break;
    }
  }
  const blockHit = player.getBlockFromViewDirection({
    maxDistance,
    includeLiquidBlocks: false,
    includePassableBlocks: false
  });
  let blockDistance = Number.POSITIVE_INFINITY;
  let blockHitPos = null;
  if (blockHit) {
    const blockLoc = blockHit.block.location;
    blockHitPos = blockHit.faceLocation ? {
      x: blockLoc.x + blockHit.faceLocation.x,
      y: blockLoc.y + blockHit.faceLocation.y,
      z: blockLoc.z + blockHit.faceLocation.z
    } : {
      x: blockLoc.x + 0.5,
      y: blockLoc.y + 0.5,
      z: blockLoc.z + 0.5
    };
    blockDistance = Math.hypot(
      blockHitPos.x - playerPos.x,
      blockHitPos.y - playerPos.y,
      blockHitPos.z - playerPos.z
    );
  }
  if (closestEntityHit && closestEntityHit.distance < blockDistance) {
    const targetEntity = closestEntityHit.entity;
    const targetPos = targetEntity.getHeadLocation ? targetEntity.getHeadLocation() : targetEntity.location;
    spawnHookshotTrail(player.dimension, startPos, targetPos);
    spawnHookshotImpact(player.dimension, targetPos);
    setHookshotLandedInAir(player, true);
    resetBlastJump(player);
    updateBlastHud(player);
    if (isSneaking) {
      if (!isHeavyEntity(targetEntity)) {
        return executeEntityPull(player, targetEntity);
      }
      return true;
    } else {
      return executePlayerMovementToEntity(player, targetEntity);
    }
  }
  if (blockHitPos) {
    spawnHookshotTrail(player.dimension, startPos, blockHitPos);
    spawnHookshotImpact(player.dimension, blockHitPos);
    setHookshotLandedInAir(player, true);
    resetBlastJump(player);
    updateBlastHud(player);
    if (isSneaking) {
      return true;
    } else {
      return executePlayerMovementToBlock(player, blockHitPos);
    }
  }
  const missDistance = Math.min(maxDistance, HOOKSHOT_PARTICLE_CONFIG.MISS_DISTANCE);
  const missEndPos = {
    x: startPos.x + viewDir.x * missDistance,
    y: startPos.y + viewDir.y * missDistance,
    z: startPos.z + viewDir.z * missDistance
  };
  spawnHookshotTrail(player.dimension, startPos, missEndPos);
  player.playSound("note.bass", { pitch: 0.5, volume: 0.3 });
  return false;
}

// src/manual-hookshot/index.ts
import {
  world as world2,
  system as system5,
  Player as Player6,
  InputButton as InputButton2,
  ButtonState as ButtonState2,
  EquipmentSlot as EquipmentSlot2
} from "@minecraft/server";

// src/manual-hookshot/config.ts
var MANUAL_HOOKSHOT_CONFIG = {
  /** アイテムID */
  ITEM_ID: "addon:manual_hookshot",
  /** 最大射程距離（ブロック） */
  MAX_DISTANCE: 120,
  /** シフト巻取り時の1フレーム（tick）あたりインパルス強度 */
  PULL_IMPULSE: 0.35,
  /** 最大巻取り速度（ブロック/tick、空気抵抗との釣り合い終端速度） */
  MAX_WIND_SPEED: 2,
  /** 重力落下を緩和するための微小な上向きインパルス補正 */
  PULL_VERTICAL_BOOST: 0.07,
  /** 巻き取り開始時に下方向の落下速度をリセット（0に相殺）するかどうか */
  RESET_DOWNWARD_VELOCITY_ON_WIND_START: true,
  /** フック着弾後、1ピル溜まるのに必要なtick数（20tick=1秒。10tick=0.5秒。3ピルで30tick=1.5秒） */
  PILL_CHARGE_TICKS_PER_PILL: 4,
  /** 解除時の爆風＆インパルス発動に必要な最大ピル数 */
  PILL_MAX_COUNT: 3,
  /** 落下速度リセット＆爆発エフェクトが発動する下方向速度の閾値（ブロック/tick。0.5で約10m/s以上の落下） */
  RESET_DOWNWARD_VELOCITY_THRESHOLD: 0.1,
  /** 落下速度リセット時に付与する低速落下（slow_falling）の持続tick数（20tick=1秒。落下ダメージをリセット） */
  SLOW_FALLING_TICKS_ON_RESET: 2,
  /** 巻き取り開始時の爆風エフェクト＆サウンドのインターバル（tick、20tick=約1秒） */
  RESET_EXPLOSION_INTERVAL_TICKS: 20,
  /** 落下速度リセット時の爆発パーティクル */
  RESET_EXPLOSION_PARTICLE: "minecraft:explosion_particle",
  /** 落下速度リセット時のサウンドID */
  RESET_EXPLOSION_SOUND: "random.explode",
  /** 落下速度リセット時のサウンド音量 */
  RESET_EXPLOSION_SOUND_VOLUME: 0.8,
  /** 落下速度リセット時のサウンドピッチ */
  RESET_EXPLOSION_SOUND_PITCH: 1.4,
  /** 目標着弾点に到達したとみなす停止判定距離（ブロック） */
  STOP_DISTANCE: 1.5,
  /** 着弾時のインパクトパーティクル */
  HIT_PARTICLE: "minecraft:large_explosion",
  /**
   * プレイヤーと着弾点を結ぶロープパーティクル
   * 推奨: "minecraft:basic_crit_particle"（矢の軌跡。endrodと違い白光りせず視界を邪魔しない細い糸状）
   * 候補: "minecraft:electric_spark_particle"（青白い極小スパーク）
   *       "minecraft:candle_flame_particle"（小さな光点）
   */
  ROPE_PARTICLE: "minecraft:basic_crit_particle",
  /** ロープパーティクルの描画間隔（ブロック） */
  ROPE_STEP_DISTANCE: 0.6,
  /** 解除時の上方向ホップインパルス強度（木の上などに着地しやすくする） */
  RELEASE_UPWARD_IMPULSE: 0.8,
  /** 空中解除時に付与する低速落下（slow_falling）の持続tick数（20tick=1秒。落下ダメージをリセット） */
  SLOW_FALLING_TICKS_ON_RELEASE: 2,
  /** 解除時の小爆発パーティクル */
  RELEASE_PARTICLE: "minecraft:explosion_particle",
  /** 解除時のサウンドID */
  RELEASE_SOUND: "random.explode",
  /** 解除時のサウンド音量 */
  RELEASE_SOUND_VOLUME: 0.6,
  /** 解除時のサウンドピッチ */
  RELEASE_SOUND_PITCH: 1.8
};

// src/settings.ts
import {
  world,
  Player as Player5,
  system as system4
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
var SETTING_KEYS = {
  AUTO_SNEAK: "setting_auto_sneak"
};
var memorySettingsFallback = /* @__PURE__ */ new Map();
function getPlayerMemoryMap(player) {
  const key = player.id || player.name || "default";
  let map = memorySettingsFallback.get(key);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    memorySettingsFallback.set(key, map);
  }
  return map;
}
function isSettingEnabled(player, key, defaultValue = false) {
  try {
    const val = player.getDynamicProperty(key);
    if (typeof val === "boolean") {
      return val;
    }
  } catch (e) {
  }
  const memMap = getPlayerMemoryMap(player);
  if (memMap.has(key)) {
    return memMap.get(key);
  }
  return defaultValue;
}
function isAutoSneakEnabled(player) {
  return isSettingEnabled(player, SETTING_KEYS.AUTO_SNEAK, false);
}
function setSettingEnabled(player, key, enabled) {
  try {
    player.setDynamicProperty(key, enabled);
  } catch (e) {
    console.error(`\u8A2D\u5B9A\u4FDD\u5B58\u30A8\u30E9\u30FC [${key}]:`, e);
  }
  getPlayerMemoryMap(player).set(key, enabled);
}
function showSettingsForm(player) {
  const currentAutoSneak = isAutoSneakEnabled(player);
  const form = new ModalFormData();
  form.title("\xA7l\xA76\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u8A2D\u5B9A");
  form.toggle("\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u5E38\u6642\u5DFB\u53D6\u308A (Switch\u7B49\u306E\u64CD\u4F5C\u88DC\u52A9)", {
    defaultValue: currentAutoSneak
  });
  form.show(player).then((response) => {
    if (response.canceled || !response.formValues) return;
    const [autoSneakVal] = response.formValues;
    setSettingEnabled(player, SETTING_KEYS.AUTO_SNEAK, autoSneakVal);
    const statusText = (val) => val ? "\xA7a[ON]\xA7r" : "\xA7c[OFF]\xA7r";
    player.sendMessage(
      `\xA7a============================
\xA76\u3010\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u8A2D\u5B9A\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3011
\xA7f\u30FB\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u5E38\u6642\u5DFB\u53D6\u308A: ${statusText(autoSneakVal)}
\xA7a============================`
    );
  }).catch((error) => {
    console.error("\u8A2D\u5B9AUI\u8868\u793A\u30A8\u30E9\u30FC:", error);
  });
}
function handleSettingsScriptEvent(event) {
  const rawId = (event.id || "").trim().toLowerCase();
  const rawMsg = (event.message || "").trim().toLowerCase();
  let cmd = "";
  let arg = "";
  if (rawId.startsWith("hookshot:")) {
    cmd = rawId.substring(9).trim();
    arg = rawMsg;
  } else if (rawId === "hookshot") {
    const parts = rawMsg.split(/\s+/);
    cmd = parts[0] || "";
    arg = parts.slice(1).join(" ").trim();
  } else if (rawId.startsWith("addon:")) {
    cmd = rawId.substring(6).trim();
    arg = rawMsg;
  } else if (rawId === "addon") {
    const parts = rawMsg.split(/\s+/);
    cmd = parts[0] || "";
    arg = parts.slice(1).join(" ").trim();
  } else {
    cmd = rawId;
    arg = rawMsg;
  }
  const validCmds = ["menu", "setting", "settings", "config", "ui", "autosneak", "auto_sneak", "sneak", "status", "help"];
  if (!validCmds.includes(cmd)) {
    return;
  }
  const allOnlinePlayers = world.getAllPlayers();
  let targets = [];
  if (event.sourceEntity && (event.sourceEntity instanceof Player5 || event.sourceEntity.typeId === "minecraft:player")) {
    targets = [event.sourceEntity];
  } else if (arg) {
    const targetName = arg.split(/\s+/)[0];
    const found = allOnlinePlayers.find(
      (p) => p.name.toLowerCase() === targetName.toLowerCase()
    );
    if (found) {
      targets = [found];
      arg = arg.substring(targetName.length).trim();
    }
  }
  if (targets.length === 0) {
    targets = allOnlinePlayers;
  }
  if (targets.length === 0) {
    return;
  }
  const primaryPlayer = targets[0];
  const isServerSource = !(event.sourceEntity instanceof Player5);
  switch (cmd) {
    case "menu":
    case "setting":
    case "settings":
    case "config":
    case "ui": {
      system4.run(() => {
        showSettingsForm(primaryPlayer);
      });
      break;
    }
    case "autosneak":
    case "auto_sneak":
    case "sneak": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isAutoSneakEnabled(primaryPlayer);
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.AUTO_SNEAK, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
        p.sendMessage(
          `\xA76[\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u8A2D\u5B9A] \u5E38\u6642\u5DFB\u53D6\u308A \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `\xA76[\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u8A2D\u5B9A] \u5E38\u6642\u5DFB\u53D6\u308A \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      break;
    }
    case "status": {
      const autoSneak = isAutoSneakEnabled(primaryPlayer);
      const statusText = (val) => val ? "\xA7a[ON]\xA7r" : "\xA7c[OFF]\xA7r";
      const statusMsg = `\xA7a============================
\xA76\u3010\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u8A2D\u5B9A\u3011
\xA7f\u30FB\u5E38\u6642\u5DFB\u53D6\u308A: ${statusText(autoSneak)}
\xA77(/scriptevent hookshot:menu \u3067\u8A2D\u5B9A\u753B\u9762\u3092\u958B\u304F)
\xA7a============================`;
      for (const p of targets) {
        p.sendMessage(statusMsg);
      }
      if (isServerSource) {
        world.sendMessage(statusMsg);
      }
      break;
    }
    case "help": {
      const helpMsg = `\xA7a============================
\xA76\u3010\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8 \u30B3\u30DE\u30F3\u30C9\u4E00\u89A7\u3011
\xA7f\u30FB/scriptevent hookshot:menu : \u8A2D\u5B9A\u753B\u9762\u3092\u958B\u304F
\u30FB/scriptevent hookshot:autosneak : \u5E38\u6642\u5DFB\u53D6\u308A\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent hookshot:status : \u73FE\u5728\u306E\u8A2D\u5B9A\u72B6\u614B\u3092\u78BA\u8A8D
\xA7a============================`;
      for (const p of targets) {
        p.sendMessage(helpMsg);
      }
      if (isServerSource) {
        world.sendMessage(helpMsg);
      }
      break;
    }
  }
}

// src/manual-hookshot/index.ts
function isSneakButtonPressed(player) {
  if (isAutoSneakEnabled(player)) {
    return true;
  }
  try {
    if (player.inputInfo) {
      return player.inputInfo.getButtonState(InputButton2.Sneak) === ButtonState2.Pressed;
    }
  } catch {
  }
  return player.isSneaking;
}
var playerHooks = /* @__PURE__ */ new Map();
var lastWindStartEffectTickMap = /* @__PURE__ */ new Map();
function isHoldingManualHookshot(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot2.Mainhand);
      if (mainhand?.typeId === MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return true;
      const offhand = equippable.getEquipment(EquipmentSlot2.Offhand);
      if (offhand?.typeId === MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return true;
    }
  } catch {
  }
  return false;
}
function getChargedPillCount(player) {
  const hook = playerHooks.get(player.id);
  if (!hook || !hook.hasStartedWinding) return 0;
  return Math.min(
    MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT,
    Math.floor(
      hook.chargeTicks / MANUAL_HOOKSHOT_CONFIG.PILL_CHARGE_TICKS_PER_PILL
    )
  );
}
function updateManualHookshotHud(player) {
  if (!player.isValid) return;
  if (isHoldingManualHookshot(player) || playerHooks.has(player.id)) {
    const hook = playerHooks.get(player.id);
    if (hook && !hook.hasStartedWinding) {
      player.onScreenDisplay.setActionBar("\xA76(\u25B0\u25B0\u25B0)");
      return;
    }
    const pills = getChargedPillCount(player);
    const maxPills = MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT;
    const activeColor = player.isOnGround ? "\xA72" : "\xA7a";
    let canHitTarget = false;
    if (!hook) {
      try {
        const entityHits = player.getEntitiesFromViewDirection({
          maxDistance: MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE
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
            includeLiquidBlocks: false
          });
          canHitTarget = blockHit !== void 0;
        }
      } catch {
      }
    }
    const emptyColor = hook || canHitTarget ? "\xA77" : "\xA78";
    if (pills >= maxPills) {
      player.onScreenDisplay.setActionBar(`${activeColor}(\u25B0\u25B0\u25B0)`);
    } else if (pills === 0) {
      player.onScreenDisplay.setActionBar(`${emptyColor}(\u25B0\u25B0\u25B0)`);
    } else {
      const filled = pills;
      const empty = maxPills - filled;
      const pillBar = activeColor + "\u25B0".repeat(filled) + emptyColor + "\u25B0".repeat(empty);
      player.onScreenDisplay.setActionBar(`\xA77(${pillBar}\xA77)`);
    }
  }
}
function resetHook(player, notify = true, isManualRelease = false) {
  const hook = playerHooks.get(player.id);
  if (!hook) return;
  const canReleaseBlast = hook.hasStartedWinding && Math.floor(
    hook.chargeTicks / MANUAL_HOOKSHOT_CONFIG.PILL_CHARGE_TICKS_PER_PILL
  ) >= MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT;
  playerHooks.delete(player.id);
  if (isManualRelease && !player.isOnGround) {
    if (canReleaseBlast) {
      try {
        const feetPos = {
          x: player.location.x,
          y: player.location.y + 0.2,
          z: player.location.z
        };
        player.dimension.spawnParticle(
          MANUAL_HOOKSHOT_CONFIG.RELEASE_PARTICLE,
          feetPos
        );
        try {
          player.dimension.spawnParticle("minecraft:wind_explosion_emitter", feetPos);
        } catch {
        }
        player.playSound(MANUAL_HOOKSHOT_CONFIG.RELEASE_SOUND, {
          pitch: MANUAL_HOOKSHOT_CONFIG.RELEASE_SOUND_PITCH,
          volume: MANUAL_HOOKSHOT_CONFIG.RELEASE_SOUND_VOLUME
        });
        player.applyImpulse({
          x: 0,
          y: MANUAL_HOOKSHOT_CONFIG.RELEASE_UPWARD_IMPULSE,
          z: 0
        });
        if (MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RELEASE > 0) {
          player.addEffect(
            "slow_falling",
            MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RELEASE,
            {
              showParticles: false
            }
          );
        }
      } catch {
      }
    } else {
      try {
        player.playSound("random.pop", { pitch: 1.2, volume: 0.8 });
      } catch {
      }
    }
  } else if (notify) {
    try {
      player.playSound("random.pop", { pitch: 1.2, volume: 0.8 });
    } catch {
    }
  }
}
function handleManualHookshotUse(event, cancelCallback) {
  const item = event.itemStack;
  if (!item || item.typeId !== MANUAL_HOOKSHOT_CONFIG.ITEM_ID) return;
  const player = event.source;
  if (!(player instanceof Player6)) return;
  cancelCallback();
  system5.run(() => {
    if (playerHooks.has(player.id)) {
      resetHook(player, true, true);
      return;
    }
    const maxDistance = MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE;
    const playerPos = player.location;
    const entityHits = player.getEntitiesFromViewDirection({
      maxDistance
    });
    let closestHeavyEntityHit = null;
    for (const hit of entityHits) {
      if (isValidHookshotTarget(player, hit.entity) && isHeavyEntity(hit.entity)) {
        closestHeavyEntityHit = hit;
        break;
      }
    }
    const blockHit = player.getBlockFromViewDirection({
      maxDistance,
      includePassableBlocks: false,
      includeLiquidBlocks: false
    });
    let blockDistance = Number.POSITIVE_INFINITY;
    let blockHitPos = null;
    if (blockHit) {
      const blockLoc = blockHit.block.location;
      blockHitPos = blockHit.faceLocation ? {
        x: blockLoc.x + blockHit.faceLocation.x,
        y: blockLoc.y + blockHit.faceLocation.y,
        z: blockLoc.z + blockHit.faceLocation.z
      } : {
        x: blockLoc.x + 0.5,
        y: blockLoc.y + 0.5,
        z: blockLoc.z + 0.5
      };
      blockDistance = Math.hypot(
        blockHitPos.x - playerPos.x,
        blockHitPos.y - playerPos.y,
        blockHitPos.z - playerPos.z
      );
    }
    let hitPos = null;
    let targetEntity = void 0;
    if (closestHeavyEntityHit && closestHeavyEntityHit.distance < blockDistance) {
      targetEntity = closestHeavyEntityHit.entity;
      hitPos = targetEntity.getHeadLocation ? targetEntity.getHeadLocation() : targetEntity.location;
    } else if (blockHitPos) {
      hitPos = blockHitPos;
    }
    if (!hitPos) {
      try {
        player.playSound("note.bass", { pitch: 0.6, volume: 0.8 });
      } catch {
      }
      return;
    }
    playerHooks.set(player.id, {
      hitPos,
      targetEntity,
      dimensionId: player.dimension.id,
      sneakTickCounter: 0,
      hasStartedWinding: false,
      chargeTicks: 0
    });
    try {
      player.dimension.spawnParticle(MANUAL_HOOKSHOT_CONFIG.HIT_PARTICLE, hitPos);
      player.playSound("item.trident.hit", { pitch: 1.2, volume: 1 });
    } catch {
    }
  });
}
function updateManualHookshots() {
  for (const [playerId, hook] of playerHooks.entries()) {
    const player = world2.getAllPlayers().find((p) => p.id === playerId);
    if (!player || !player.isValid) {
      playerHooks.delete(playerId);
      continue;
    }
    const dimension = player.dimension;
    if (dimension.id !== hook.dimensionId) {
      resetHook(player, false, false);
      continue;
    }
    if (hook.targetEntity) {
      if (!hook.targetEntity.isValid || hook.targetEntity.dimension.id !== dimension.id) {
        resetHook(player, true, false);
        continue;
      }
      try {
        hook.hitPos = hook.targetEntity.getHeadLocation ? hook.targetEntity.getHeadLocation() : hook.targetEntity.location;
      } catch {
        resetHook(player, true, false);
        continue;
      }
    }
    const hitPos = hook.hitPos;
    const headPos = player.getHeadLocation();
    if (hook.hasStartedWinding) {
      hook.chargeTicks++;
    }
    const playerPos = {
      x: headPos.x,
      y: headPos.y - 0.4,
      z: headPos.z
    };
    const dx = hitPos.x - playerPos.x;
    const dy = hitPos.y - playerPos.y;
    const dz = hitPos.z - playerPos.z;
    const distance = Math.hypot(dx, dy, dz);
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
            z: playerPos.z + dz * t
          });
        } catch {
        }
      }
    }
    if (isSneakButtonPressed(player)) {
      let vel = { x: 0, y: 0, z: 0 };
      try {
        vel = player.getVelocity();
      } catch {
      }
      if (!hook.hasStartedWinding) {
        hook.hasStartedWinding = true;
        const downwardSpeed = -vel.y;
        if (MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_ON_WIND_START && downwardSpeed >= MANUAL_HOOKSHOT_CONFIG.RESET_DOWNWARD_VELOCITY_THRESHOLD) {
          try {
            player.applyImpulse({ x: 0, y: -vel.y, z: 0 });
            const lastEffectTick = lastWindStartEffectTickMap.get(player.id) ?? -9999;
            if (system5.currentTick - lastEffectTick >= MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_INTERVAL_TICKS) {
              lastWindStartEffectTickMap.set(player.id, system5.currentTick);
              const feetPos = {
                x: player.location.x,
                y: player.location.y + 0.2,
                z: player.location.z
              };
              player.dimension.spawnParticle(
                MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_PARTICLE,
                feetPos
              );
              try {
                player.dimension.spawnParticle("minecraft:wind_explosion_emitter", feetPos);
              } catch {
              }
              player.playSound(MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_SOUND, {
                pitch: MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_SOUND_PITCH,
                volume: MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_SOUND_VOLUME
              });
            }
            if (MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RESET > 0) {
              player.addEffect(
                "slow_falling",
                MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_RESET,
                {
                  showParticles: false
                }
              );
            }
          } catch {
          }
          vel.y = 0;
        }
      }
      const stopDistance = hook.targetEntity ? Math.max(MANUAL_HOOKSHOT_CONFIG.STOP_DISTANCE, 2.5) : MANUAL_HOOKSHOT_CONFIG.STOP_DISTANCE;
      if (distance > stopDistance) {
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        const evalVelY = Math.max(0, vel.y);
        const speedAlongTarget = vel.x * nx + evalVelY * ny + vel.z * nz;
        const maxSpeed = MANUAL_HOOKSHOT_CONFIG.MAX_WIND_SPEED;
        let effectiveImpulse = 0;
        if (speedAlongTarget <= 0) {
          effectiveImpulse = MANUAL_HOOKSHOT_CONFIG.PULL_IMPULSE;
        } else if (speedAlongTarget < maxSpeed) {
          const ratio = 1 - speedAlongTarget / maxSpeed;
          effectiveImpulse = MANUAL_HOOKSHOT_CONFIG.PULL_IMPULSE * ratio;
        }
        if (effectiveImpulse > 0) {
          const impulse = {
            x: nx * effectiveImpulse,
            y: ny * effectiveImpulse + MANUAL_HOOKSHOT_CONFIG.PULL_VERTICAL_BOOST,
            z: nz * effectiveImpulse
          };
          try {
            player.applyImpulse(impulse);
          } catch {
          }
        }
        hook.sneakTickCounter++;
      } else {
        hook.sneakTickCounter++;
      }
    } else {
      hook.sneakTickCounter = 0;
    }
  }
}
function initManualHookshot() {
  world2.beforeEvents.itemUse.subscribe((event) => {
    handleManualHookshotUse(event, () => {
      event.cancel = true;
    });
  });
  system5.runInterval(() => {
    updateManualHookshots();
    for (const player of world2.getAllPlayers()) {
      updateManualHookshotHud(player);
    }
  }, 1);
  world2.afterEvents.entityDie.subscribe((event) => {
    const dead = event.deadEntity;
    if (dead instanceof Player6) {
      if (playerHooks.has(dead.id)) {
        resetHook(dead, false, false);
      }
      lastWindStartEffectTickMap.delete(dead.id);
    }
  });
  world2.afterEvents.playerDimensionChange.subscribe((event) => {
    const player = event.player;
    if (player && player.isValid) {
      if (playerHooks.has(player.id)) {
        resetHook(player, false, false);
      }
      lastWindStartEffectTickMap.delete(player.id);
    }
  });
  world2.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    if (player && player.isValid) {
      if (playerHooks.has(player.id)) {
        resetHook(player, false, false);
      }
      lastWindStartEffectTickMap.delete(player.id);
    }
  });
}

// src/index.ts
system6.run(() => {
  console.warn("\xA7a[Hookshot Addon] \u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u30A2\u30C9\u30AA\u30F3\u304C\u6B63\u5E38\u306B\u30ED\u30FC\u30C9\u3055\u308C\u307E\u3057\u305F\u3002");
});
initManualHookshot();
world3.beforeEvents.itemUse.subscribe((event) => {
  handleHookshotUse(event, () => {
    event.cancel = true;
  });
});
try {
  world3.afterEvents.playerButtonInput?.subscribe((event) => {
    handleBlastJumpButtonInput(event);
  });
} catch (e) {
}
world3.beforeEvents.entityHurt.subscribe((event) => {
  handleBlastJumpDamage(event);
});
world3.afterEvents.entityHitEntity.subscribe((event) => {
  handleHookshotEntityHit(event);
});
system6.runInterval(() => {
  for (const player of world3.getAllPlayers()) {
    if (!player.isValid) continue;
    if (player.isOnGround) {
      handlePlayerGroundTouch(player);
    } else {
      try {
        if (player.inputInfo?.getButtonState(InputButton3.Jump) === ButtonState3.Released) {
          setJumpButtonReleasedInAir(player, true);
        }
      } catch {
      }
      updateFallDamageImmunity(player, 2);
    }
    if (isHoldingHookshot(player)) {
      updateBlastHud(player);
    }
  }
}, 2);
system6.afterEvents.scriptEventReceive.subscribe((event) => {
  try {
    handleSettingsScriptEvent(event);
  } catch (error) {
    console.error("\u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u8A2D\u5B9A\u30A4\u30D9\u30F3\u30C8\u51E6\u7406\u30A8\u30E9\u30FC:", error);
  }
});
