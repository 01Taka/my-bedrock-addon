// src/index.ts
import { system as system2 } from "@minecraft/server";

// src/manual-hookshot/index.ts
import {
  world,
  system,
  Player,
  EquipmentSlot
} from "@minecraft/server";

// src/manual-hookshot/config.ts
var MANUAL_HOOKSHOT_CONFIG = {
  /** アイテムID */
  ITEM_ID: "addon:manual_hookshot",
  AUTO_ITEM_ID: "addon:auto_hookshot",
  MANUAL_PARACHUTE_ITEM_ID: "addon:manual_hookshot_parachute",
  AUTO_PARACHUTE_ITEM_ID: "addon:auto_hookshot_parachute",
  /** パラシュート付きフックショットの巻き取り中に付与する低速落下の持続tick数（50tick=2.5秒） */
  SLOW_FALLING_TICKS_ON_PARACHUTE_WIND: 50,
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
  /** 落下速度リセット時に付与する低速落下（slow_falling）の持続tick数（マルチプレイのPing考慮で15tick=0.75秒。落下ダメージを確実に無効化） */
  SLOW_FALLING_TICKS_ON_RESET: 3,
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
  /** ロープパーティクルの描画間隔（ブロック。マルチプレイのパケット帯域を考慮し1.2ブロック間隔で軽量化） */
  ROPE_STEP_DISTANCE: 1.2,
  /** フック着弾後、アイテム使用による手動解除を受け付けない最小待機tick（マルチプレイのパケットジッター・長押しによる誤解除暴発を防止） */
  RELEASE_DEBOUNCE_TICKS: 5,
  /** 解除時の上方向ホップインパルス強度（木の上などに着地しやすくする） */
  RELEASE_UPWARD_IMPULSE: 0.8,
  /** 空中解除時に付与する低速落下（slow_falling）の持続tick数 */
  SLOW_FALLING_TICKS_ON_RELEASE: 3,
  /** 解除時の小爆発パーティクル */
  RELEASE_PARTICLE: "minecraft:explosion_particle",
  /** 解除時のサウンドID */
  RELEASE_SOUND: "random.explode",
  /** 解除時のサウンド音量 */
  RELEASE_SOUND_VOLUME: 0.6,
  /** 解除時のサウンドピッチ */
  RELEASE_SOUND_PITCH: 1.8,
  /** メインハンド非所持時にフックを着弾点付近で手動解除できる最大距離（ブロック） */
  DETACH_REACH_DISTANCE: 3,
  /** メインハンド非所持時にフックを着弾点付近で手動解除する際の視線方向内積閾値（0.70で約45度以内） */
  DETACH_VIEW_ANGLE_COS: 0.7
};
function isHookshotItemId(typeId) {
  return typeId === MANUAL_HOOKSHOT_CONFIG.ITEM_ID || typeId === MANUAL_HOOKSHOT_CONFIG.AUTO_ITEM_ID || typeId === MANUAL_HOOKSHOT_CONFIG.MANUAL_PARACHUTE_ITEM_ID || typeId === MANUAL_HOOKSHOT_CONFIG.AUTO_PARACHUTE_ITEM_ID;
}
function isAutoHookshotItemId(typeId) {
  return typeId === MANUAL_HOOKSHOT_CONFIG.AUTO_ITEM_ID || typeId === MANUAL_HOOKSHOT_CONFIG.AUTO_PARACHUTE_ITEM_ID;
}
function isParachuteHookshotItemId(typeId) {
  return typeId === MANUAL_HOOKSHOT_CONFIG.MANUAL_PARACHUTE_ITEM_ID || typeId === MANUAL_HOOKSHOT_CONFIG.AUTO_PARACHUTE_ITEM_ID;
}

// src/manual-hookshot/entities.ts
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
var HEAVY_ENTITY_TYPES = [
  "minecraft:iron_golem",
  "minecraft:warden",
  "minecraft:ender_dragon",
  "minecraft:wither",
  "minecraft:elder_guardian",
  "minecraft:ravager",
  "minecraft:ghast"
];
function isHeavyEntity(entity) {
  return HEAVY_ENTITY_TYPES.includes(entity.typeId);
}
function isValidHookshotTarget(player, entity) {
  if (entity.id === player.id) return false;
  if (!entity.isValid) return false;
  if (EXCLUDED_ENTITY_TYPES.includes(entity.typeId)) return false;
  return true;
}

// src/manual-hookshot/index.ts
function isSneakButtonPressed(player) {
  try {
    const input = player.inputInfo;
    if (input && typeof input.getButtonState === "function") {
      const state = input.getButtonState("Sneak");
      if (state === "Pressed" || state === 1) {
        return true;
      }
    }
  } catch {
  }
  return player.isSneaking;
}
var playerHooks = /* @__PURE__ */ new Map();
var lastWindStartEffectTickMap = /* @__PURE__ */ new Map();
var playersWithPillHud = /* @__PURE__ */ new Set();
var targetAimCache = /* @__PURE__ */ new Map();
function isHoldingManualHookshot(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (isHookshotItemId(mainhand?.typeId)) return true;
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
      if (isHookshotItemId(offhand?.typeId)) return true;
    }
  } catch {
  }
  return false;
}
function isHoldingManualHookshotInMainhand(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (isHookshotItemId(mainhand?.typeId)) return true;
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
  const shouldShow = isHoldingManualHookshot(player) || playerHooks.has(player.id);
  if (shouldShow) {
    playersWithPillHud.add(player.id);
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
      const cached = targetAimCache.get(player.id);
      if (cached && system.currentTick - cached.lastCheckTick < 4) {
        canHitTarget = cached.canHit;
      } else {
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
        targetAimCache.set(player.id, {
          canHit: canHitTarget,
          lastCheckTick: system.currentTick
        });
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
  } else if (playersWithPillHud.has(player.id)) {
    playersWithPillHud.delete(player.id);
    try {
      player.onScreenDisplay.setActionBar("");
    } catch {
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
  if (!isHoldingManualHookshot(player) && playersWithPillHud.has(player.id)) {
    playersWithPillHud.delete(player.id);
    try {
      player.onScreenDisplay.setActionBar("");
    } catch {
    }
  }
}
function tryDetachHookOnInteract(player) {
  if (!player.isValid) return false;
  const hook = playerHooks.get(player.id);
  if (!hook) return false;
  if (isHoldingManualHookshotInMainhand(player)) return false;
  const headPos = player.getHeadLocation();
  const hitPos = hook.hitPos;
  const dx = hitPos.x - headPos.x;
  const dy = hitPos.y - headPos.y;
  const dz = hitPos.z - headPos.z;
  const dist = Math.hypot(dx, dy, dz);
  if (dist > MANUAL_HOOKSHOT_CONFIG.DETACH_REACH_DISTANCE) {
    return false;
  }
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
  resetHook(player, true, true);
  return true;
}
function handleManualHookshotUse(event, cancelCallback) {
  const item = event.itemStack;
  if (!item || !isHookshotItemId(item.typeId)) return;
  const isAuto = isAutoHookshotItemId(item.typeId);
  const hasParachute = isParachuteHookshotItemId(item.typeId);
  const player = event.source;
  if (!(player instanceof Player)) return;
  cancelCallback();
  system.run(() => {
    const existingHook = playerHooks.get(player.id);
    if (existingHook) {
      if (system.currentTick - existingHook.attachedTick < MANUAL_HOOKSHOT_CONFIG.RELEASE_DEBOUNCE_TICKS) {
        return;
      }
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
      chargeTicks: 0,
      attachedTick: system.currentTick,
      isAuto,
      hasParachute
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
    const player = world.getAllPlayers().find((p) => p.id === playerId);
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
    const shouldWind = hook.isAuto || isSneakButtonPressed(player);
    if (shouldWind) {
      if (hook.hasParachute) {
        try {
          player.addEffect(
            "slow_falling",
            MANUAL_HOOKSHOT_CONFIG.SLOW_FALLING_TICKS_ON_PARACHUTE_WIND,
            {
              showParticles: false
            }
          );
        } catch {
        }
      }
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
            if (system.currentTick - lastEffectTick >= MANUAL_HOOKSHOT_CONFIG.RESET_EXPLOSION_INTERVAL_TICKS) {
              lastWindStartEffectTickMap.set(player.id, system.currentTick);
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
  world.beforeEvents.itemUse.subscribe((event) => {
    handleManualHookshotUse(event, () => {
      event.cancel = true;
    });
    if (event.source instanceof Player) {
      if (tryDetachHookOnInteract(event.source)) {
        event.cancel = true;
      }
    }
  });
  world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    if (tryDetachHookOnInteract(event.player)) {
      event.cancel = true;
    }
  });
  world.beforeEvents.playerInteractWithEntity.subscribe((event) => {
    if (tryDetachHookOnInteract(event.player)) {
      event.cancel = true;
    }
  });
  system.runInterval(() => {
    updateManualHookshots();
    for (const player of world.getAllPlayers()) {
      updateManualHookshotHud(player);
    }
  }, 1);
  world.afterEvents.entityDie.subscribe((event) => {
    const dead = event.deadEntity;
    if (dead instanceof Player) {
      if (playerHooks.has(dead.id)) {
        resetHook(dead, false, false);
      }
      lastWindStartEffectTickMap.delete(dead.id);
      playersWithPillHud.delete(dead.id);
      targetAimCache.delete(dead.id);
    }
  });
  world.afterEvents.playerDimensionChange.subscribe((event) => {
    const player = event.player;
    if (player && player.isValid) {
      if (playerHooks.has(player.id)) {
        resetHook(player, false, false);
      }
      lastWindStartEffectTickMap.delete(player.id);
      playersWithPillHud.delete(player.id);
      targetAimCache.delete(player.id);
    }
  });
  world.afterEvents.playerSpawn.subscribe((event) => {
    const player = event.player;
    if (player && player.isValid) {
      if (playerHooks.has(player.id)) {
        resetHook(player, false, false);
      }
      lastWindStartEffectTickMap.delete(player.id);
      playersWithPillHud.delete(player.id);
      targetAimCache.delete(player.id);
    }
  });
  world.beforeEvents.playerLeave.subscribe((event) => {
    const player = event.player;
    if (player) {
      playerHooks.delete(player.id);
      lastWindStartEffectTickMap.delete(player.id);
      playersWithPillHud.delete(player.id);
      targetAimCache.delete(player.id);
    }
  });
}

// src/index.ts
system2.run(() => {
  console.warn("\xA7a[Hookshot Addon] \u30D5\u30C3\u30AF\u30B7\u30E7\u30C3\u30C8\u30A2\u30C9\u30AA\u30F3\u304C\u6B63\u5E38\u306B\u30ED\u30FC\u30C9\u3055\u308C\u307E\u3057\u305F\u3002");
});
initManualHookshot();
