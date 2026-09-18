import {
  world,
  Player,
  Vector3,
  system,
  ItemStack,
  EquipmentSlot,
} from "@minecraft/server";
import { waypointCache, deleteWaypoint } from "./store-waypoint";
import {
  Waypoint,
  getWaypointDisplayName,
  getWaypointKey as getWpKeyFromTypes,
} from "./waypoint.types";
import { removeWaypointMarker } from "./waypoint-marker";

export interface VirtualNavState {
  targetOffset: Vector3; // 到達目標オフセット (headLocからの相対ベクトル)
  startOffset: Vector3; // アニメーション開始時のオフセット
  animStartTick: number; // アニメーション開始tick
  animDurationTicks: number; // アニメーション所要tick数 (デフォルト10)
  lastUseTick: number; // 連打・誤爆防止用 tick
  wasHoldingCompass: boolean; // コンパス持ち替え検知用フラグ
  pinnedWaypointKey: string | null; // 固定されたウェイポイントの一意キー
  wasShowingHUD: boolean; // HUD表示中フラグ (即時消去用)
  unpinNoticeUntilTick: number; // 固定解除メッセージ表示終了tick
  // クールダウン用
  lastLeftClickTick: number; // 左クリックの連打防止用 tick
  // 通知HUD演出用（[非表示] / [表示] / [固定解除]）
  noticeText: string | null;
  noticeUntilTick: number;
}

export const SPHERE_RADIUS = 30.0;
export const PRE_STEP_DISTANCE = 50.0; // 最初に必ず進む距離
export const ZOOM_ANIM_DURATION_TICKS = 10; // 10 tick (0.5秒)

// 視野角15度 (half angle) の cos 値
const COS_15_DEG = Math.cos((15 * Math.PI) / 180); // 約 0.9659258

const playerVirtualNavMap = new Map<string, VirtualNavState>();
const playerFocusedWaypointMap = new Map<string, Waypoint | null>();
const playerHiddenWaypointsMap = new Map<string, Set<string>>();

/**
 * プレイヤーごとの非表示ウェイポイント判定
 */
export function isWaypointHiddenForPlayer(player: Player, wpKey: string): boolean {
  const hiddenSet = playerHiddenWaypointsMap.get(player.id);
  if (!hiddenSet) return false;
  return hiddenSet.has(wpKey);
}

/**
 * プレイヤーの特定ウェイポイントの非表示設定/解除
 */
export function setWaypointHiddenForPlayer(player: Player, wpKey: string, hidden: boolean): void {
  let hiddenSet = playerHiddenWaypointsMap.get(player.id);
  if (!hiddenSet) {
    hiddenSet = new Set<string>();
    playerHiddenWaypointsMap.set(player.id, hiddenSet);
  }
  if (hidden) {
    hiddenSet.add(wpKey);
  } else {
    hiddenSet.delete(wpKey);
  }
}

/**
 * プレイヤーの特定ウェイポイントの非表示状態をトグル (返り値: トグル後に非表示ならtrue, 表示ならfalse)
 */
export function toggleWaypointHiddenForPlayer(player: Player, wpKey: string): boolean {
  const currentHidden = isWaypointHiddenForPlayer(player, wpKey);
  const nextHidden = !currentHidden;
  setWaypointHiddenForPlayer(player, wpKey, nextHidden);
  return nextHidden;
}

/**
 * ウェイポイントの一意キーを取得
 */
export function getWaypointKey(wp: Waypoint): string {
  const shortDim = wp.dim.replace(/^minecraft:/, "");
  return `${shortDim}@${Math.floor(wp.pos.x)},${Math.floor(wp.pos.y)},${Math.floor(wp.pos.z)}`;
}

/**
 * ベクトルを正規化（長さ1の単位ベクトル化）
 */
function normalize(v: Vector3): Vector3 {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

/**
 * プレイヤーの仮想ナビゲーション状態を取得
 */
export function getPlayerVirtualNav(player: Player): VirtualNavState | undefined {
  return playerVirtualNavMap.get(player.id);
}

/**
 * プレイヤー退出時に仮想ナビゲーションのキャッシュをクリーンアップ
 */
export function clearPlayerVirtualNav(playerId: string): void {
  playerVirtualNavMap.delete(playerId);
  playerFocusedWaypointMap.delete(playerId);
  playerHiddenWaypointsMap.delete(playerId);
}

/**
 * プレイヤーが固定しているウェイポイントキーを取得
 */
export function getPinnedWaypointKey(player: Player): string | null {
  const state = playerVirtualNavMap.get(player.id);
  return state?.pinnedWaypointKey ?? null;
}

/**
 * プレイヤーがメインハンドにコンパスを持っているか判定
 */
export function isPlayerHoldingCompass(player: Player): boolean {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return false;
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
    return mainhand?.typeId === "minecraft:compass";
  } catch {
    return false;
  }
}

/**
 * 現在フォーカス（注視または固定）されているウェイポイントを取得
 */
export function getFocusedWaypoint(player: Player): Waypoint | null {
  return playerFocusedWaypointMap.get(player.id) ?? null;
}

/**
 * 10tickのEase-Outイージングを適用した現在の3次元補間オフセットを取得
 */
export function getCurrentVirtualOffset(player: Player): Vector3 {
  const state = playerVirtualNavMap.get(player.id);
  if (!state) return { x: 0, y: 0, z: 0 };

  const currentTick = system.currentTick;
  const elapsed = currentTick - state.animStartTick;

  if (elapsed >= state.animDurationTicks) {
    return { ...state.targetOffset };
  }
  if (elapsed <= 0) {
    return { ...state.startOffset };
  }

  const p = Math.min(1, Math.max(0, elapsed / state.animDurationTicks));
  const easeOut = 1 - Math.pow(1 - p, 3);

  return {
    x: state.startOffset.x + (state.targetOffset.x - state.startOffset.x) * easeOut,
    y: state.startOffset.y + (state.targetOffset.y - state.startOffset.y) * easeOut,
    z: state.startOffset.z + (state.targetOffset.z - state.startOffset.z) * easeOut,
  };
}

/**
 * プレイヤーの仮想視点（実際の頭の位置 + 補間オフセット）を計算
 */
export function getVirtualHeadLocation(player: Player): Vector3 {
  const headLoc = player.getHeadLocation();
  const offset = getCurrentVirtualOffset(player);
  return {
    x: headLoc.x + offset.x,
    y: headLoc.y + offset.y,
    z: headLoc.z + offset.z,
  };
}

/**
 * 仮想座標 origin からの視線レイに対し、視野角15度以内で最も直線距離が近いウェイポイントを検索
 */
export function findRayClosestWaypoint(
  origin: Vector3,
  direction: Vector3,
  dimensionId: string,
  player?: Player,
): { waypoint: Waypoint; perpendicularDist: number } | null {
  let closest: { waypoint: Waypoint; perpendicularDist: number } | null = null;

  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;

    // プレイヤーが指定されており、そのプレイヤーが非表示に設定している場合はスキップ
    if (player && isWaypointHiddenForPlayer(player, getWaypointKey(wp))) {
      continue;
    }

    const dx = wp.pos.x - origin.x;
    const dy = wp.pos.y - origin.y;
    const dz = wp.pos.z - origin.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);

    if (dist < 0.1) continue;

    // レイへの投影長 t
    const t = direction.x * dx + direction.y * dy + direction.z * dz;
    if (t <= 0) continue; // 背後は除外

    // 視野角15度判定
    const cosTheta = t / dist;
    if (cosTheta < COS_15_DEG) continue;

    // レイとの最短直線距離
    const perpDist = Math.sqrt(Math.max(0, distSq - t * t));

    if (!closest || perpDist < closest.perpendicularDist) {
      closest = {
        waypoint: wp,
        perpendicularDist: perpDist,
      };
    }
  }

  return closest;
}

/**
 * プレイヤーの現在位置・視線からターゲット位置への相対8方向矢印を取得
 */
export function getRelative8DirectionArrow(player: Player, targetPos: Vector3): string {
  const headLoc = player.getHeadLocation();
  const viewDir = player.getViewDirection();

  // プレイヤーの水平視線角度 (ラジアン)
  const playerYaw = Math.atan2(viewDir.x, -viewDir.z);

  // ターゲットへの水平ベクトル
  const dx = targetPos.x - headLoc.x;
  const dz = targetPos.z - headLoc.z;
  const targetYaw = Math.atan2(dx, -dz);

  let diffRad = targetYaw - playerYaw;
  let diffDeg = ((diffRad * 180 / Math.PI) % 360 + 540) % 360 - 180; // -180 ~ +180

  if (diffDeg >= -22.5 && diffDeg < 22.5) return "↑";
  if (diffDeg >= 22.5 && diffDeg < 67.5) return "↗";
  if (diffDeg >= 67.5 && diffDeg < 112.5) return "→";
  if (diffDeg >= 112.5 && diffDeg < 157.5) return "↘";
  if (diffDeg >= 157.5 || diffDeg < -157.5) return "↓";
  if (diffDeg >= -157.5 && diffDeg < -112.5) return "↙";
  if (diffDeg >= -112.5 && diffDeg < -67.5) return "←";
  return "↖";
}

interface RaySphereHit {
  additionalDistance: number; // 50m地点から球の手前表面までの追加前進距離 (>= 0)
  waypoint: Waypoint;
}

/**
 * 50m先行地点 (origin50) から direction 方向へのレイと半径 radius のウェイポイント球との交差判定
 */
function findTargetWaypointSphereFromPreStep(
  origin50: Vector3,
  direction: Vector3,
  dimensionId: string,
  radius: number,
): RaySphereHit | null {
  let bestHit: RaySphereHit | null = null;
  const r2 = radius * radius;

  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;

    const dx = origin50.x - wp.pos.x;
    const dy = origin50.y - wp.pos.y;
    const dz = origin50.z - wp.pos.z;

    const c = dx * dx + dy * dy + dz * dz - r2;

    if (c <= 0) {
      if (!bestHit || 0 < bestHit.additionalDistance) {
        bestHit = {
          additionalDistance: 0,
          waypoint: wp,
        };
      }
      continue;
    }

    const b = direction.x * dx + direction.y * dy + direction.z * dz;
    const delta = b * b - c;

    if (delta < 0) continue;

    const sqrtDelta = Math.sqrt(delta);
    const sHit = -b - sqrtDelta;

    if (sHit >= 0) {
      if (!bestHit || sHit < bestHit.additionalDistance) {
        bestHit = {
          additionalDistance: sHit,
          waypoint: wp,
        };
      }
    }
  }

  return bestHit;
}

/**
 * コンパス使用時のハンドラー:
 * - シフトあり右クリック: 固定・解除
 * - シフトなし右クリック: ズーム（仮想前進）
 */
export function handleCompassVirtualNav(
  player: Player,
  itemStack?: ItemStack,
  cancelCallback?: () => void,
): void {
  if (!(player instanceof Player) || !player.isValid) return;
  if (!itemStack || itemStack.typeId !== "minecraft:compass") return;

  const currentTick = system.currentTick;
  let state = playerVirtualNavMap.get(player.id);

  if (!state) {
    state = {
      targetOffset: { x: 0, y: 0, z: 0 },
      startOffset: { x: 0, y: 0, z: 0 },
      animStartTick: currentTick,
      animDurationTicks: ZOOM_ANIM_DURATION_TICKS,
      lastUseTick: 0,
      wasHoldingCompass: true,
      pinnedWaypointKey: null,
      wasShowingHUD: false,
      unpinNoticeUntilTick: 0,
      lastLeftClickTick: 0,
      noticeText: null,
      noticeUntilTick: 0,
    };
    playerVirtualNavMap.set(player.id, state);
  }

  // 5 tick (0.25秒) のクールダウンでズーム誤爆等を防止
  // ただしスニーク中のダブルクリックは通過させる
  if (!player.isSneaking && currentTick - state.lastUseTick < 5) {
    cancelCallback?.();
    return;
  }

  state.lastUseTick = currentTick;
  cancelCallback?.();

  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead: Vector3 = {
    x: headLoc.x + currentOffset.x,
    y: headLoc.y + currentOffset.y,
    z: headLoc.z + currentOffset.z,
  };

  // ----------------------------------------------------
  // 真下を向いて右クリック: 同座標ウェイポイントの削除
  // ----------------------------------------------------
  if (viewDir.y < -0.85) {
    const pLoc = player.location;
    const currentDim = player.dimension.id.replace(/^minecraft:/, "");
    const matchedWaypoint = waypointCache.find((wp) => {
      if (wp.dim !== currentDim) return false;
      const sameX = Math.floor(pLoc.x) === Math.floor(wp.pos.x);
      const sameZ = Math.floor(pLoc.z) === Math.floor(wp.pos.z);
      const sameY =
        Math.floor(pLoc.y) === Math.floor(wp.pos.y) ||
        Math.floor(pLoc.y - 0.5) === Math.floor(wp.pos.y) ||
        Math.abs(pLoc.y - wp.pos.y) <= 1.8;
      return sameX && sameZ && sameY;
    });

    if (matchedWaypoint) {
      deleteWaypoint(player.dimension, matchedWaypoint.pos);
      const deletedKey = getWaypointKey(matchedWaypoint);
      if (state.pinnedWaypointKey === deletedKey) {
        state.pinnedWaypointKey = null;
      }
      // マーカーエンティティ（ネームタグ）を削除
      removeWaypointMarker(player.dimension, deletedKey, matchedWaypoint.pos);

      const deletedDisplayName = getWaypointDisplayName(matchedWaypoint);
      const wpPos = { ...matchedWaypoint.pos };
      const dim = player.dimension;

      try {
        player.sendMessage(`§c[Waypoint] §f${deletedDisplayName} §cを削除しました`);
        player.onScreenDisplay.setActionBar(`§c[Waypoint] §f${deletedDisplayName} §cを削除しました`);
        world.sendMessage(`§c[Waypoint] §f${deletedDisplayName} §cが ${player.name} によって削除されました`);
      } catch {}

      // beforeEvents のイベントキャンセルや read-only 制約と競合して音が消えるのを防ぐため、system.run で確実に再生
      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1.2, volume: 1.0 });
          }
          dim.playSound("random.break", wpPos, { pitch: 1.2, volume: 1.0 });
        } catch {}
      });
      return;
    }
  }

  // ----------------------------------------------------
  // シフトあり右クリック: 視野角15度による「固定」または「固定解除」（トグル）
  // ----------------------------------------------------
  if (player.isSneaking) {
    const closestHit = findRayClosestWaypoint(virtHead, viewDir, player.dimension.id, player);

    if (closestHit) {
      const key = getWaypointKey(closestHit.waypoint);
      const hitDisplayName = getWaypointDisplayName(closestHit.waypoint);

      if (state.pinnedWaypointKey === key) {
        // 既に固定されているウェイポイント -> 固定解除（トグルOFF）
        state.pinnedWaypointKey = null;
        state.unpinNoticeUntilTick = currentTick + 15; // 15 tick (0.75秒) 表示後に即座クリア
        state.noticeText = "§7[固定解除]";
        state.noticeUntilTick = currentTick + 15;
        state.wasShowingHUD = true;
        try {
          player.onScreenDisplay.setActionBar("§7[固定解除]");
        } catch {}
        system.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.break", { pitch: 1.0, volume: 0.8 });
            }
          } catch {}
        });
      } else {
        // 未固定のウェイポイント -> 固定（トグルON）
        state.pinnedWaypointKey = key;
        state.unpinNoticeUntilTick = 0;
        state.noticeText = null;
        state.noticeUntilTick = 0;
        try {
          player.onScreenDisplay.setActionBar(
            `§6[Waypoint] §f${hitDisplayName} §6を固定しました`,
          );
        } catch {}
        system.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
            }
          } catch {}
        });
      }
    }
    return;
  }

  // ----------------------------------------------------
  // シフトなし右クリック: ズーム（仮想前進）
  // ----------------------------------------------------

  // ----------------------------------------------------
  // シフトなし右クリック: ズーム（仮想前進）
  // ----------------------------------------------------
  const baseOffset = { ...state.targetOffset };
  const origin: Vector3 = {
    x: headLoc.x + baseOffset.x,
    y: headLoc.y + baseOffset.y,
    z: headLoc.z + baseOffset.z,
  };

  // 処理の最初に必ず50m進んでから判定
  const origin50: Vector3 = {
    x: origin.x + viewDir.x * PRE_STEP_DISTANCE,
    y: origin.y + viewDir.y * PRE_STEP_DISTANCE,
    z: origin.z + viewDir.z * PRE_STEP_DISTANCE,
  };

  const hit = findTargetWaypointSphereFromPreStep(
    origin50,
    viewDir,
    player.dimension.id,
    SPHERE_RADIUS,
  );

  let totalStep: number;
  let targetName: string | null = null;

  if (hit) {
    totalStep = PRE_STEP_DISTANCE + hit.additionalDistance;
    targetName = getWaypointDisplayName(hit.waypoint);
  } else {
    totalStep = PRE_STEP_DISTANCE;
  }

  const deltaX = viewDir.x * totalStep;
  const deltaY = viewDir.y * totalStep;
  const deltaZ = viewDir.z * totalStep;

  state.startOffset = currentOffset;
  state.targetOffset = {
    x: baseOffset.x + deltaX,
    y: baseOffset.y + deltaY,
    z: baseOffset.z + deltaZ,
  };
  state.animStartTick = currentTick;
  state.animDurationTicks = ZOOM_ANIM_DURATION_TICKS;

  const totalDist = Math.round(
    Math.sqrt(
      state.targetOffset.x * state.targetOffset.x +
      state.targetOffset.y * state.targetOffset.y +
      state.targetOffset.z * state.targetOffset.z,
    ),
  );
  const roundedStep = Math.round(totalStep);

  try {
    if (targetName) {
      player.onScreenDisplay.setActionBar(
        `§b[Waypoint] §f${targetName} §bの30m手前へズーム (+${roundedStep}m, 累計: ${totalDist}m)`,
      );
    } else {
      player.onScreenDisplay.setActionBar(
        `§b[Waypoint] 視線方向へ前進: +${roundedStep}m (累計: ${totalDist}m)`,
      );
    }
    player.playSound("random.click", { pitch: 1.3, volume: 0.8 });
  } catch {}
}

/**
 * コンパス所持時に左クリック（腕を振る / playerSwingStart）した時のハンドラー:
 * - 4m以内（非ズーム時）: 表示 / 非表示 のトグル切り替え
 * - 4m超 または ズーム時: 対象ウェイポイントの遠隔非表示化（OFF）
 */
export function handleCompassLeftClick(
  player: Player,
  itemStack?: ItemStack,
): void {
  if (!(player instanceof Player) || !player.isValid) return;
  if (!itemStack || itemStack.typeId !== "minecraft:compass") return;

  const currentTick = system.currentTick;
  let state = playerVirtualNavMap.get(player.id);
  if (!state) {
    state = {
      targetOffset: { x: 0, y: 0, z: 0 },
      startOffset: { x: 0, y: 0, z: 0 },
      animStartTick: currentTick,
      animDurationTicks: ZOOM_ANIM_DURATION_TICKS,
      lastUseTick: 0,
      wasHoldingCompass: true,
      pinnedWaypointKey: null,
      wasShowingHUD: false,
      unpinNoticeUntilTick: 0,
      lastLeftClickTick: 0,
      noticeText: null,
      noticeUntilTick: 0,
    };
    playerVirtualNavMap.set(player.id, state);
  }

  // 4 tick (0.2秒) のクールダウンで連打・誤爆防止
  if (currentTick - state.lastLeftClickTick < 4) {
    return;
  }
  state.lastLeftClickTick = currentTick;

  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead: Vector3 = {
    x: headLoc.x + currentOffset.x,
    y: headLoc.y + currentOffset.y,
    z: headLoc.z + currentOffset.z,
  };

  const isZoomed =
    Math.abs(currentOffset.x) > 0.01 ||
    Math.abs(currentOffset.y) > 0.01 ||
    Math.abs(currentOffset.z) > 0.01 ||
    Math.abs(state.targetOffset.x) > 0.01 ||
    Math.abs(state.targetOffset.y) > 0.01 ||
    Math.abs(state.targetOffset.z) > 0.01;

  const zoomPrefix = isZoomed ? "§7ズーム中 / " : "";

  // ----------------------------------------------------
  // 1. 近く（4m以内、非ズーム時）での表示・非表示トグル
  // ----------------------------------------------------
  if (!isZoomed) {
    const currentDim = player.dimension.id.replace(/^minecraft:/, "");
    let closeTargetWp: Waypoint | null = null;
    let closestDist = 999;
    const COS_30_DEG = Math.cos((30 * Math.PI) / 180); // 約 0.866

    for (const wp of waypointCache) {
      const wpDim = wp.dim.replace(/^minecraft:/, "");
      if (wpDim !== currentDim) continue;

      const dx = wp.pos.x - headLoc.x;
      const dy = wp.pos.y - headLoc.y;
      const dz = wp.pos.z - headLoc.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist <= 4.0 && dist > 0.01) {
        const dirX = dx / dist;
        const dirY = dy / dist;
        const dirZ = dz / dist;
        const dot = viewDir.x * dirX + viewDir.y * dirY + viewDir.z * dirZ;

        if (dot >= COS_30_DEG && dist < closestDist) {
          closestDist = dist;
          closeTargetWp = wp;
        }
      }
    }

    if (closeTargetWp) {
      const wpKey = getWaypointKey(closeTargetWp);
      const isNowHidden = toggleWaypointHiddenForPlayer(player, wpKey);
      const displayName = getWaypointDisplayName(closeTargetWp);
      const realDist = Math.round(closestDist);
      const arrow = getRelative8DirectionArrow(player, closeTargetWp.pos);

      // もし非表示にした対象が現在固定されていたら固定解除
      if (isNowHidden && state.pinnedWaypointKey === wpKey) {
        state.pinnedWaypointKey = null;
      }

      state.noticeUntilTick = currentTick + 15; // 15 tick (0.75秒) 表示
      state.wasShowingHUD = true;

      if (isNowHidden) {
        state.noticeText = `§7[非表示] §e${displayName} §f${realDist}m §b${arrow}`;
        system.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.break", { pitch: 1.0, volume: 0.8 });
            }
          } catch {}
        });
      } else {
        state.noticeText = `§a[表示] §e${displayName} §f${realDist}m §b${arrow}`;
        system.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
            }
          } catch {}
        });
      }

      try {
        player.onScreenDisplay.setActionBar(state.noticeText);
      } catch {}

      return;
    }
  }

  // ----------------------------------------------------
  // 2. 遠隔（4m超またはズーム時）での非表示化（OFF）
  // ----------------------------------------------------
  // 表示中のウェイポイント（未非表示）を対象に視線検索
  const closestHit = findRayClosestWaypoint(virtHead, viewDir, player.dimension.id, player);

  if (closestHit) {
    const key = getWaypointKey(closestHit.waypoint);
    const hitDisplayName = getWaypointDisplayName(closestHit.waypoint);

    // 非表示化を実行
    setWaypointHiddenForPlayer(player, key, true);

    // もし固定されていたら固定解除
    if (state.pinnedWaypointKey === key) {
      state.pinnedWaypointKey = null;
    }

    const hDx = closestHit.waypoint.pos.x - headLoc.x;
    const hDy = closestHit.waypoint.pos.y - headLoc.y;
    const hDz = closestHit.waypoint.pos.z - headLoc.z;
    const hDist = Math.round(Math.sqrt(hDx * hDx + hDy * hDy + hDz * hDz));
    const hArrow = getRelative8DirectionArrow(player, closestHit.waypoint.pos);

    state.noticeText = `${zoomPrefix}§c[非表示] §e${hitDisplayName} §f${hDist}m §b${hArrow}`;
    state.noticeUntilTick = currentTick + 15; // 15 tick (0.75秒) 一瞬表示
    state.wasShowingHUD = true;

    try {
      player.onScreenDisplay.setActionBar(state.noticeText);
    } catch {}

    system.run(() => {
      try {
        if (player && player.isValid) {
          player.playSound("random.break", { pitch: 1.0, volume: 0.9 });
        }
      } catch {}
    });
  }
}

/**
 * 毎tick実行されるHUDナビゲーション更新＆持ち替え検知処理
 */
export function updatePlayerVirtualNavHUD(player: Player): void {
  const currentTick = system.currentTick;
  let state = playerVirtualNavMap.get(player.id);

  if (!state) {
    state = {
      targetOffset: { x: 0, y: 0, z: 0 },
      startOffset: { x: 0, y: 0, z: 0 },
      animStartTick: currentTick,
      animDurationTicks: ZOOM_ANIM_DURATION_TICKS,
      lastUseTick: 0,
      wasHoldingCompass: false,
      pinnedWaypointKey: null,
      wasShowingHUD: false,
      unpinNoticeUntilTick: 0,
      lastLeftClickTick: 0,
      noticeText: null,
      noticeUntilTick: 0,
    };
    playerVirtualNavMap.set(player.id, state);
  }

  const isHolding = isPlayerHoldingCompass(player);

  // ----------------------------------------------------
  // コンパスから持ち替えた瞬間の検知 -> 仮想位置リセット
  // ----------------------------------------------------
  if (state.wasHoldingCompass && !isHolding) {
    const currentOffset = getCurrentVirtualOffset(player);
    const hasOffset =
      Math.abs(currentOffset.x) > 0.01 ||
      Math.abs(currentOffset.y) > 0.01 ||
      Math.abs(currentOffset.z) > 0.01;

    if (hasOffset || state.targetOffset.x !== 0 || state.targetOffset.y !== 0 || state.targetOffset.z !== 0) {
      state.startOffset = currentOffset;
      state.targetOffset = { x: 0, y: 0, z: 0 };
      state.animStartTick = currentTick;
      state.animDurationTicks = ZOOM_ANIM_DURATION_TICKS;
    }
  }
  state.wasHoldingCompass = isHolding;

  // ----------------------------------------------------
  // 対象ウェイポイントの決定
  // ----------------------------------------------------
  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead: Vector3 = {
    x: headLoc.x + currentOffset.x,
    y: headLoc.y + currentOffset.y,
    z: headLoc.z + currentOffset.z,
  };

  let activeWaypoint: Waypoint | null = null;
  let isPinnedActive = false;

  // 固定中のウェイポイントを検索
  let pinnedWp: Waypoint | null = null;
  if (state.pinnedWaypointKey) {
    for (const wp of waypointCache) {
      if (getWaypointKey(wp) === state.pinnedWaypointKey) {
        pinnedWp = wp;
        break;
      }
    }
    // もしキャッシュから消えているか、非表示に設定されていれば固定解除
    if (!pinnedWp || isWaypointHiddenForPlayer(player, state.pinnedWaypointKey)) {
      state.pinnedWaypointKey = null;
      pinnedWp = null;
    }
  }

  if (isHolding && player.isSneaking) {
    // コンパスを持ってスニーク中: 視野角15度以内の最寄りウェイポイントを検出（固定選択プレビュー）
    const closestHit = findRayClosestWaypoint(virtHead, viewDir, player.dimension.id, player);
    if (closestHit) {
      activeWaypoint = closestHit.waypoint;
      isPinnedActive = pinnedWp !== null && getWaypointKey(activeWaypoint) === state.pinnedWaypointKey;
    } else if (pinnedWp) {
      activeWaypoint = pinnedWp;
      isPinnedActive = true;
    }
  } else {
    // スニークしていない時、またはコンパス非所持時:
    // 固定中のウェイポイントがある場合のみ表示
    if (pinnedWp) {
      activeWaypoint = pinnedWp;
      isPinnedActive = true;
    }
  }

  // フォーカス中ウェイポイントの保存（パーティクル強調用）
  playerFocusedWaypointMap.set(player.id, activeWaypoint);

  // ズーム中フラグ（コンパス所持時のみ有効）
  const isZoomed =
    isHolding &&
    (Math.abs(currentOffset.x) > 0.01 ||
      Math.abs(currentOffset.y) > 0.01 ||
      Math.abs(currentOffset.z) > 0.01 ||
      Math.abs(state.targetOffset.x) > 0.01 ||
      Math.abs(state.targetOffset.y) > 0.01 ||
      Math.abs(state.targetOffset.z) > 0.01);

  const zoomPrefix = isZoomed ? "§7ズーム中 / " : "";

  // ----------------------------------------------------
  // 画面中央下部（アクションバー）へのUI表示: 「名前 〇m ↑」
  // ----------------------------------------------------
  if (currentTick < state.noticeUntilTick && state.noticeText) {
    // トグル・非表示完了・解除などの一瞬表示メッセージ
    try {
      player.onScreenDisplay.setActionBar(state.noticeText);
    } catch {}
    state.wasShowingHUD = true;
  } else if (currentTick < state.unpinNoticeUntilTick) {
    // 固定解除メッセージ表示期間中: 固定解除テキストを最優先で維持
    try {
      player.onScreenDisplay.setActionBar("§7[固定解除]");
    } catch {}
    state.wasShowingHUD = true;
  } else if (activeWaypoint) {
    // プレイヤーの実際の現在地からの直線距離
    const dx = activeWaypoint.pos.x - headLoc.x;
    const dy = activeWaypoint.pos.y - headLoc.y;
    const dz = activeWaypoint.pos.z - headLoc.z;
    const realDist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));

    // 現在向いている方角に対する相対8方向矢印
    const arrow = getRelative8DirectionArrow(player, activeWaypoint.pos);

    const activeDisplayName = getWaypointDisplayName(activeWaypoint);

    try {
      if (isPinnedActive && isHolding) {
        player.onScreenDisplay.setActionBar(
          `${zoomPrefix}§6[固定] §e${activeDisplayName} §f${realDist}m §b${arrow}`,
        );
      } else {
        player.onScreenDisplay.setActionBar(
          `${zoomPrefix}§e${activeDisplayName} §f${realDist}m §b${arrow}`,
        );
      }
      state.wasShowingHUD = true;
    } catch {}
  } else if (isZoomed) {
    // ウェイポイントが表示されていない場合でも、コンパスを持ってズーム中なら「ズーム中」を表示
    try {
      player.onScreenDisplay.setActionBar("§7ズーム中");
    } catch {}
    state.wasShowingHUD = true;
  } else if (state.wasShowingHUD) {
    // 非表示になった瞬間にスペースを送信して確実に画面をクリア (0秒消去)
    try {
      player.onScreenDisplay.setActionBar(" ");
    } catch {}
    state.wasShowingHUD = false;
  }
}
