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
  WAYPOINT_PROXIMITY_RANGE,
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
  lastPinToggleTick: number; // 固定/固定解除トグルのクールダウン用 tick (長押し高速トグル防止)
  // 通知HUD演出用（[非表示] / [表示] / [固定解除]）
  noticeText: string | null;
  noticeUntilTick: number;
  // 遠隔ダブルクリック非表示用
  remoteHideTargetKey: string | null;
  remoteHideClickTick: number;
  // シルクタッチ削除クールダウン用
  lastSilkTouchDeleteTick: number;
  // リカバリーコンパス: 死亡地点のみ表示モード (false: すべて表示, true: 死亡地点のみ表示)
  recoveryCompassDeathOnly: boolean;
}

export const SPHERE_RADIUS = 30.0;
export const PRE_STEP_DISTANCE = 50.0; // 最初に必ず進む距離
export const ZOOM_ANIM_DURATION_TICKS = 10; // 10 tick (0.5秒)
export const PIN_TOGGLE_COOLDOWN_TICKS = 15; // 15 tick (0.75秒) 固定/固定解除のクールダウン
export const REMOTE_HIDE_DOUBLE_CLICK_TICKS = 15; // 15 tick (0.75秒) 遠隔非表示ダブルクリック判定（HUD表示時間と同期）

// 視野角15度 (half angle) の cos 値
const COS_15_DEG = Math.cos((15 * Math.PI) / 180); // 約 0.9659258

const playerVirtualNavMap = new Map<string, VirtualNavState>();
const playerFocusedWaypointMap = new Map<string, Waypoint | null>();
const playerHiddenWaypointsMap = new Map<string, Set<string>>();

/**
 * プレイヤーごとの非表示ウェイポイント判定
 */
export function isWaypointHiddenForPlayer(
  player: Player,
  wpKey: string,
): boolean {
  const hiddenSet = playerHiddenWaypointsMap.get(player.id);
  if (!hiddenSet) return false;
  return hiddenSet.has(wpKey);
}

/**
 * プレイヤーの特定ウェイポイントの非表示設定/解除
 */
export function setWaypointHiddenForPlayer(
  player: Player,
  wpKey: string,
  hidden: boolean,
): void {
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
export function toggleWaypointHiddenForPlayer(
  player: Player,
  wpKey: string,
): boolean {
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
export function getPlayerVirtualNav(
  player: Player,
): VirtualNavState | undefined {
  return playerVirtualNavMap.get(player.id);
}

/**
 * プレイヤーの仮想ナビゲーション状態を取得、存在しない場合は初期化して返す
 */
export function getOrCreatePlayerVirtualNav(player: Player): VirtualNavState {
  let state = playerVirtualNavMap.get(player.id);
  if (!state) {
    const currentTick = system.currentTick;
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
      lastPinToggleTick: 0,
      noticeText: null,
      noticeUntilTick: 0,
      remoteHideTargetKey: null,
      remoteHideClickTick: 0,
      lastSilkTouchDeleteTick: 0,
      recoveryCompassDeathOnly: false,
    };
    playerVirtualNavMap.set(player.id, state);
  }
  return state;
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
 * プレイヤーがメインハンドにコンパスまたはリカバリーコンパスを持っているか判定
 */
export function isPlayerHoldingCompass(player: Player): boolean {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return false;
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
    return (
      mainhand?.typeId === "minecraft:compass" ||
      mainhand?.typeId === "minecraft:recovery_compass"
    );
  } catch {
    return false;
  }
}

/**
 * プレイヤーがメインハンドにリカバリーコンパスを持っているか判定
 */
export function isPlayerHoldingRecoveryCompass(player: Player): boolean {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return false;
    const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
    return mainhand?.typeId === "minecraft:recovery_compass";
  } catch {
    return false;
  }
}

/**
 * プレイヤーがインベントリ内（ホットバー、メインインベントリ、オフハンド含む）にリカバリーコンパスを所持しているか判定
 */
export function hasRecoveryCompassInInventory(player: Player): boolean {
  try {
    if (!player || !player.isValid) return false;

    // 1. 通常インベントリ（ホットバー含む）の確認
    const invComp = player.getComponent("minecraft:inventory");
    const container = invComp?.container;
    if (container) {
      for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:recovery_compass") {
          return true;
        }
      }
    }

    // 2. オフハンド・メインハンド装備スロットの確認
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const offhand = equippable.getEquipment(EquipmentSlot.Offhand);
      if (offhand?.typeId === "minecraft:recovery_compass") {
        return true;
      }
      const mainhand = equippable.getEquipment(EquipmentSlot.Mainhand);
      if (mainhand?.typeId === "minecraft:recovery_compass") {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * プレイヤーに対して対象ウェイポイントが可視（表示・検出可能）かどうか判定
 * - source === "death" の場合: 死亡した本人のみ、かつリカバリーコンパス所持時のみ可視
 * - 通常ウェイポイントの場合: 通常コンパスまたはリカバリーコンパス所持時に可視
 */
export function isWaypointVisibleToPlayer(
  player: Player,
  waypoint: Waypoint,
  requireCompassCheck: boolean = true,
): boolean {
  if (isWaypointHiddenForPlayer(player, getWaypointKey(waypoint))) {
    return false;
  }

  if (waypoint.source === "death") {
    // 死亡した本人のみ
    if (waypoint.creatorId && waypoint.creatorId !== player.id) {
      return false;
    }
    // リカバリーコンパスが必要
    if (requireCompassCheck && !isPlayerHoldingRecoveryCompass(player)) {
      return false;
    }
  } else {
    // リカバリーコンパス所持時に「死亡地点のみ表示」モードが有効な場合、死亡地点以外は不可視
    if (isPlayerHoldingRecoveryCompass(player)) {
      const state = playerVirtualNavMap.get(player.id);
      if (state?.recoveryCompassDeathOnly) {
        return false;
      }
    }
    // 通常ウェイポイント
    if (requireCompassCheck && !isPlayerHoldingCompass(player)) {
      return false;
    }
  }

  return true;
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
    x:
      state.startOffset.x +
      (state.targetOffset.x - state.startOffset.x) * easeOut,
    y:
      state.startOffset.y +
      (state.targetOffset.y - state.startOffset.y) * easeOut,
    z:
      state.startOffset.z +
      (state.targetOffset.z - state.startOffset.z) * easeOut,
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

    // プレイヤーが指定されており、可視条件を満たさない場合はスキップ
    if (player && !isWaypointVisibleToPlayer(player, wp, true)) {
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
 * プレイヤーの至近距離（WAYPOINT_PROXIMITY_RANGE内）かつ視線方向（30度以内）にある
 * 表示・非表示トグル対象のウェイポイントを取得する。
 */
export function getNearbyToggleableWaypoint(
  player: Player,
  headLoc: Vector3,
  viewDir: Vector3,
): { waypoint: Waypoint; dist: number } | null {
  const currentDim = player.dimension.id.replace(/^minecraft:/, "");
  let closeTargetWp: Waypoint | null = null;
  let closestDist = 999;
  const COS_30_DEG = Math.cos((30 * Math.PI) / 180); // 約 0.866

  for (const wp of waypointCache) {
    const wpDim = wp.dim.replace(/^minecraft:/, "");
    if (wpDim !== currentDim) continue;

    // 死亡ウェイポイントの場合は本人かつリカバリーコンパス所持時のみ対象
    if (wp.source === "death") {
      if (
        wp.creatorId !== player.id ||
        !isPlayerHoldingRecoveryCompass(player)
      ) {
        continue;
      }
    } else {
      // 死亡地点のみ表示モード中の場合、通常ウェイポイントは操作対象外
      if (
        isPlayerHoldingRecoveryCompass(player) &&
        playerVirtualNavMap.get(player.id)?.recoveryCompassDeathOnly
      ) {
        continue;
      }
    }

    const dx = wp.pos.x - headLoc.x;
    const dy = wp.pos.y - headLoc.y;
    const dz = wp.pos.z - headLoc.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist <= WAYPOINT_PROXIMITY_RANGE && dist > 0.01) {
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
    return { waypoint: closeTargetWp, dist: closestDist };
  }
  return null;
}

/**
 * プレイヤーが死亡地点ウェイポイントに近接（WAYPOINT_PROXIMITY_RANGE以内）し、
 * 既存ロジック（30度以内）で視線を合わせた際に自動で削除する
 */
export function checkAndAutoDeleteDeathWaypoint(player: Player): boolean {
  if (!player || !player.isValid) return false;

  const currentDim = player.dimension.id.replace(/^minecraft:/, "");
  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const COS_30_DEG = Math.cos((30 * Math.PI) / 180); // 約 0.866 (既存ロジックと同一)

  for (const wp of waypointCache) {
    if (wp.source !== "death") continue;
    // 死亡した本人のみ操作（削除）可能
    if (wp.creatorId !== player.id) continue;

    const wpDim = wp.dim.replace(/^minecraft:/, "");
    if (wpDim !== currentDim) continue;

    const dx = wp.pos.x - headLoc.x;
    const dy = wp.pos.y - headLoc.y;
    const dz = wp.pos.z - headLoc.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist <= WAYPOINT_PROXIMITY_RANGE && dist > 0.01) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const dirZ = dz / dist;
      const dot = viewDir.x * dirX + viewDir.y * dirY + viewDir.z * dirZ;

      if (dot >= COS_30_DEG) {
        // 条件合致: 自動削除
        const key = getWaypointKey(wp);
        deleteWaypoint(player.dimension, wp.pos);
        removeWaypointMarker(player.dimension, key, wp.pos);

        const state = getPlayerVirtualNav(player);
        if (state && state.pinnedWaypointKey === key) {
          state.pinnedWaypointKey = null;
        }

        const displayName = getWaypointDisplayName(wp);
        try {
          player.sendMessage(
            `§a[Waypoint] ${displayName} に到達したため、ウェイポイントを削除しました`,
          );

          // リカバリーコンパスがインベントリ内にある場合のみHUDとSEを実行
          if (hasRecoveryCompassInInventory(player)) {
            player.onScreenDisplay.setActionBar(
              `§a[Waypoint] ${displayName} に到達したため、ウェイポイントを削除しました`,
            );
            player.playSound("random.orb", { pitch: 1.2, volume: 1.0 });
          }
        } catch {}

        return true;
      }
    }
  }

  return false;
}

/**
 * プレイヤーの現在位置・視線からターゲット位置への相対8方向矢印を取得
 */
export function getRelative8DirectionArrow(
  player: Player,
  targetPos: Vector3,
): string {
  const headLoc = player.getHeadLocation();
  const viewDir = player.getViewDirection();

  // プレイヤーの水平視線角度 (ラジアン)
  const playerYaw = Math.atan2(viewDir.x, -viewDir.z);

  // ターゲットへの水平ベクトル
  const dx = targetPos.x - headLoc.x;
  const dz = targetPos.z - headLoc.z;
  const targetYaw = Math.atan2(dx, -dz);

  let diffRad = targetYaw - playerYaw;
  let diffDeg = (((((diffRad * 180) / Math.PI) % 360) + 540) % 360) - 180; // -180 ~ +180

  if (diffDeg >= -22.5 && diffDeg < 22.5) return "↑";
  if (diffDeg >= 22.5 && diffDeg < 67.5) return "↗";
  if (diffDeg >= 67.5 && diffDeg < 112.5) return "→";
  if (diffDeg >= 112.5 && diffDeg < 157.5) return "↘";
  if (diffDeg >= 157.5 || diffDeg < -157.5) return "↓";
  if (diffDeg >= -157.5 && diffDeg < -112.5) return "↙";
  if (diffDeg >= -112.5 && diffDeg < -67.5) return "←";
  return "↖";
}

/**
 * プレイヤーがズーム（仮想前進）中かどうか判定する
 */
export function isPlayerZoomed(player: Player): boolean {
  const state = playerVirtualNavMap.get(player.id);
  if (!state) return false;
  return (
    Math.abs(state.targetOffset.x) > 0.01 ||
    Math.abs(state.targetOffset.y) > 0.01 ||
    Math.abs(state.targetOffset.z) > 0.01
  );
}

/**
 * ウェイポイント作成時からの経過時間をフォーマット
 * - 60分以内 -> m分 (例: 0分, 15分, 59分)
 * - 72時間以内 -> h時間 (例: 1時間, 24時間, 72時間)
 * - 72時間越え -> d日 (例: 3日, 5日)
 */
export function formatWaypointElapsedTime(createdAt?: string): string {
  if (!createdAt) return "0分";
  const createdMs = new Date(createdAt).getTime();
  if (isNaN(createdMs)) return "0分";

  const diffMs = Math.max(0, Date.now() - createdMs);
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 60) {
    return `${diffMinutes}分`;
  } else if (diffHours <= 72) {
    return `${diffHours}時間`;
  } else {
    return `${diffDays}日`;
  }
}

/**
 * ウェイポイントのHUD表示文字列を統一フォーマットで生成する汎用関数
 * フォーマット: `(ズーム中 / ) [操作] ウェイポイント名 (時間) 距離 矢印`
 * - 死亡座標に向かってリカバリーコンパスを持ってシフトしたときのみ経過時間を追加
 *
 * @param player 対象プレイヤー
 * @param waypoint 対象ウェイポイント
 * @param actionTag 操作タグ (例: "§6[固定]", "§7[固定解除]", "§c[非表示]", "§a[表示]")。空文字列時はタグなし
 * @param isZoomed ズーム中フラグ (省略時はプレイヤーの状態から自動判定)
 */
export function formatWaypointHUDText(
  player: Player,
  waypoint: Waypoint,
  actionTag: string = "",
  isZoomed?: boolean,
): string {
  const zoomed = isZoomed !== undefined ? isZoomed : isPlayerZoomed(player);
  const zoomPrefix = zoomed ? "§7ズーム中 / " : "";

  const headLoc = player.getHeadLocation();
  const dx = waypoint.pos.x - headLoc.x;
  const dy = waypoint.pos.y - headLoc.y;
  const dz = waypoint.pos.z - headLoc.z;
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));

  const displayName = getWaypointDisplayName(waypoint);
  const arrow = getRelative8DirectionArrow(player, waypoint.pos);

  // 死亡座標に向かってリカバリーコンパスを持ってシフトしている場合のみ経過時間を追加
  const isDeathShiftWithRecovery =
    waypoint.source === "death" &&
    player.isSneaking &&
    isPlayerHoldingRecoveryCompass(player);

  const timePart = isDeathShiftWithRecovery
    ? `§7${formatWaypointElapsedTime(waypoint.createdAt)}前 `
    : "";

  const tagPart = actionTag ? `${actionTag} ` : "";
  return `${zoomPrefix}${tagPart}§e${displayName} ${timePart}§f${dist}m §b${arrow}`;
}

/**
 * ウェイポイント操作時の一時HUD通知（Notice）を設定・即時反映する汎用関数
 *
 * @param player 対象プレイヤー
 * @param waypoint 対象ウェイポイント
 * @param actionTag 操作タグ (例: "§6[固定]", "§7[固定解除]", "§c[非表示]", "§a[表示]")
 * @param durationTicks 表示時間 (tick, デフォルト 15 tick = 0.75秒)
 */
export function showWaypointOperationNotice(
  player: Player,
  waypoint: Waypoint,
  actionTag: string,
  durationTicks: number = 15,
): void {
  const state = getOrCreatePlayerVirtualNav(player);
  const currentTick = system.currentTick;
  const text = formatWaypointHUDText(player, waypoint, actionTag);

  state.noticeText = text;
  state.noticeUntilTick = currentTick + durationTicks;
  state.wasShowingHUD = true;

  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
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
  player?: Player,
): RaySphereHit | null {
  let bestHit: RaySphereHit | null = null;
  const r2 = radius * radius;

  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;

    if (player && !isWaypointVisibleToPlayer(player, wp, true)) {
      continue;
    }

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
  if (
    !itemStack ||
    (itemStack.typeId !== "minecraft:compass" &&
      itemStack.typeId !== "minecraft:recovery_compass")
  ) {
    return;
  }

  const currentTick = system.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);

  // 5 tick (0.25秒) の全体クールダウンで右クリック連打・チャタリングを防止
  if (currentTick - state.lastUseTick < 5) {
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
  // 近接範囲内（WAYPOINT_PROXIMITY_RANGE）でウェイポイントの方向を向いている時:
  // 右クリックで対象ウェイポイントの固定状態をトグル（シフト不要）
  // ※非表示になっている場合は、表示状態に切り替えて固定状態にする
  // ----------------------------------------------------
  const nearbyTarget = getNearbyToggleableWaypoint(player, headLoc, viewDir);
  if (nearbyTarget) {
    cancelCallback?.();

    // 【長押し高速トグル防止】固定/固定解除のクールダウン判定 (15 tick = 0.75秒)
    if (currentTick - state.lastPinToggleTick < PIN_TOGGLE_COOLDOWN_TICKS) {
      return;
    }

    state.lastPinToggleTick = currentTick; // トグル操作を実行したためクールダウンを更新

    const targetWp = nearbyTarget.waypoint;
    const key = getWaypointKey(targetWp);
    const isHidden = isWaypointHiddenForPlayer(player, key);

    if (isHidden) {
      // 対象が非表示になっている場合: 表示状態に切り替えて固定状態にする
      setWaypointHiddenForPlayer(player, key, false);
      state.pinnedWaypointKey = key;
      showWaypointOperationNotice(player, targetWp, "§6[固定]");
      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
          }
        } catch {}
      });
    } else if (state.pinnedWaypointKey === key) {
      // 既に固定されている場合: 固定解除（トグルOFF）
      state.pinnedWaypointKey = null;
      showWaypointOperationNotice(player, targetWp, "§7[固定解除]");
      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1.0, volume: 0.8 });
          }
        } catch {}
      });
    } else {
      // 表示中で未固定の場合: 固定（トグルON）
      state.pinnedWaypointKey = key;
      showWaypointOperationNotice(player, targetWp, "§6[固定]");
      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
          }
        } catch {}
      });
    }

    return;
  }

  // ----------------------------------------------------
  // シフトあり右クリック: 視野角15度による「固定」または「固定解除」（トグル）
  // ----------------------------------------------------
  if (player.isSneaking) {
    // 【長押し高速トグル防止】固定/固定解除のクールダウン判定 (15 tick = 0.75秒)
    if (currentTick - state.lastPinToggleTick < PIN_TOGGLE_COOLDOWN_TICKS) {
      return;
    }

    const closestHit = findRayClosestWaypoint(
      virtHead,
      viewDir,
      player.dimension.id,
      player,
    );

    if (closestHit) {
      state.lastPinToggleTick = currentTick; // トグル操作を実行したためクールダウンを更新
      const key = getWaypointKey(closestHit.waypoint);
      const hitDisplayName = getWaypointDisplayName(closestHit.waypoint);

      if (state.pinnedWaypointKey === key) {
        // 既に固定されているウェイポイント -> 固定解除（トグルOFF）
        state.pinnedWaypointKey = null;
        showWaypointOperationNotice(
          player,
          closestHit.waypoint,
          "§7[固定解除]",
        );
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
        showWaypointOperationNotice(player, closestHit.waypoint, "§6[固定]");
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
    player,
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
 * - 近接範囲内（WAYPOINT_PROXIMITY_RANGE以内、非ズーム時）: 表示 / 非表示 のトグル切り替え（1クリック）
 * - 遠隔（4m超またはズーム時）: 2連続クリック（0.75秒以内）で非表示化（[非表示 ■□] -> [非表示 ■■]）
 */
export function handleCompassLeftClick(
  player: Player,
  itemStack?: ItemStack,
): void {
  if (!(player instanceof Player) || !player.isValid) return;
  if (
    !itemStack ||
    (itemStack.typeId !== "minecraft:compass" &&
      itemStack.typeId !== "minecraft:recovery_compass")
  ) {
    return;
  }

  const isRecoveryCompass = itemStack.typeId === "minecraft:recovery_compass";

  // ----------------------------------------------------
  // シフトなし状態で左クリックした場合:
  // - 普通のコンパス: 無視
  // - リカバリーコンパス: 死亡地点のみ表示 と すべてのウェイポイントを表示 をトグル
  // ----------------------------------------------------
  if (!player.isSneaking) {
    if (!isRecoveryCompass) {
      // 普通のコンパス: 無視
      return;
    }

    const currentTick = system.currentTick;
    const state = getOrCreatePlayerVirtualNav(player);

    // 連打防止クールダウン (5 tick = 0.25秒)
    if (currentTick - state.lastLeftClickTick < 5) {
      return;
    }
    state.lastLeftClickTick = currentTick;

    state.recoveryCompassDeathOnly = !state.recoveryCompassDeathOnly;

    const isDeathOnly = state.recoveryCompassDeathOnly;
    const modeText = isDeathOnly
      ? "§c[Recovery Compass] 死亡地点のみ表示"
      : "§a[Recovery Compass] すべてのウェイポイントを表示";

    state.noticeText = modeText;
    state.noticeUntilTick = currentTick + 20; // 1秒間
    state.wasShowingHUD = true;

    try {
      player.onScreenDisplay.setActionBar(modeText);
    } catch {}

    system.run(() => {
      try {
        if (player && player.isValid) {
          if (isDeathOnly) {
            player.playSound("random.orb", { pitch: 1.5, volume: 1.0 });
          } else {
            player.playSound("random.orb", { pitch: 1.0, volume: 1.0 });
          }
        }
      } catch {}
    });

    return;
  }

  // ----------------------------------------------------
  // シフトあり（スニーク中）: 既存の非表示トグル / 遠隔ダブルクリック非表示処理
  // ----------------------------------------------------
  const currentTick = system.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);

  // 連打・誤爆防止（素早いダブルクリックを許容するため 2 tick = 0.1秒）
  if (currentTick - state.lastLeftClickTick < 2) {
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

  // ----------------------------------------------------
  // 1. 近接（WAYPOINT_PROXIMITY_RANGE以内、非ズーム時）: 1クリックで表示/非表示のトグル
  // ----------------------------------------------------
  if (!isZoomed) {
    const nearbyTarget = getNearbyToggleableWaypoint(player, headLoc, viewDir);
    if (nearbyTarget) {
      // 近接トグル時は遠隔ダブルクリック状態をリセット
      state.remoteHideTargetKey = null;
      state.remoteHideClickTick = 0;

      const { waypoint: closeTargetWp } = nearbyTarget;
      const wpKey = getWaypointKey(closeTargetWp);
      const isNowHidden = toggleWaypointHiddenForPlayer(player, wpKey);

      // もし非表示にした対象が現在固定されていたら固定解除
      if (isNowHidden && state.pinnedWaypointKey === wpKey) {
        state.pinnedWaypointKey = null;
      }

      if (isNowHidden) {
        showWaypointOperationNotice(player, closeTargetWp, "§7[非表示]");
        system.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.break", { pitch: 1.0, volume: 0.8 });
            }
          } catch {}
        });
      } else {
        showWaypointOperationNotice(player, closeTargetWp, "§a[表示]");
        system.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
            }
          } catch {}
        });
      }
      return;
    }
  }

  // ----------------------------------------------------
  // 2. 遠隔（4m超またはズーム時）: 視野角15度以内のウェイポイントを2連続左クリックで非表示化
  //    一回目: [非表示 ■□] (予告)
  //    二回目: [非表示 ■■] (非表示実行)
  //    間隔: 0.75秒以内 (REMOTE_HIDE_DOUBLE_CLICK_TICKS = 15 tick)
  // ----------------------------------------------------
  const closestHit = findRayClosestWaypoint(
    virtHead,
    viewDir,
    player.dimension.id,
    player,
  );
  if (!closestHit) {
    // 視線先に対象ウェイポイントがない場合はダブルクリック状態をリセット
    state.remoteHideTargetKey = null;
    state.remoteHideClickTick = 0;
    return;
  }

  const targetWp = closestHit.waypoint;
  const wpKey = getWaypointKey(targetWp);

  if (
    state.remoteHideTargetKey === wpKey &&
    currentTick - state.remoteHideClickTick <= REMOTE_HIDE_DOUBLE_CLICK_TICKS
  ) {
    // 2回目クリック: 実行
    state.remoteHideTargetKey = null;
    state.remoteHideClickTick = 0;

    if (targetWp.source === "death") {
      // 死亡ウェイポイントの場合は非表示ではなく削除を実行
      deleteWaypoint(player.dimension, targetWp.pos);
      removeWaypointMarker(player.dimension, wpKey, targetWp.pos);

      if (state.pinnedWaypointKey === wpKey) {
        state.pinnedWaypointKey = null;
      }

      const displayName = getWaypointDisplayName(targetWp);
      showWaypointOperationNotice(player, targetWp, "§c[削除 ■■]");
      try {
        player.sendMessage(`§c[Waypoint] ${displayName} を削除しました`);
      } catch {}

      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1.2, volume: 1.0 });
          }
        } catch {}
      });
    } else {
      // 通常ウェイポイントの場合は非表示を実行
      setWaypointHiddenForPlayer(player, wpKey, true);

      // 固定中なら解除
      if (state.pinnedWaypointKey === wpKey) {
        state.pinnedWaypointKey = null;
      }

      showWaypointOperationNotice(player, targetWp, "§c[非表示 ■■]");
      system.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1.0, volume: 0.8 });
          }
        } catch {}
      });
    }
  } else {
    // 1回目クリック: 予告HUD表示
    state.remoteHideTargetKey = wpKey;
    state.remoteHideClickTick = currentTick;

    const noticeTag =
      targetWp.source === "death" ? "§c[削除 ■□]" : "§c[非表示 ■□]";
    showWaypointOperationNotice(player, targetWp, noticeTag);
    system.run(() => {
      try {
        if (player && player.isValid) {
          player.playSound("random.orb", { pitch: 1.2, volume: 0.8 });
        }
      } catch {}
    });
  }
}

/**
 * 毎tick実行されるHUDナビゲーション更新＆持ち替え検知処理
 */
export function updatePlayerVirtualNavHUD(player: Player): void {
  // 近接かつ視線を合わせた死亡ウェイポイントを自動削除
  checkAndAutoDeleteDeathWaypoint(player);

  const currentTick = system.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);

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

    if (
      hasOffset ||
      state.targetOffset.x !== 0 ||
      state.targetOffset.y !== 0 ||
      state.targetOffset.z !== 0
    ) {
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
    if (
      !pinnedWp ||
      isWaypointHiddenForPlayer(player, state.pinnedWaypointKey)
    ) {
      state.pinnedWaypointKey = null;
      pinnedWp = null;
    } else if (pinnedWp.source === "death") {
      // 死亡ウェイポイントの場合は本人専用
      if (pinnedWp.creatorId && pinnedWp.creatorId !== player.id) {
        state.pinnedWaypointKey = null;
        pinnedWp = null;
      } else if (!hasRecoveryCompassInInventory(player)) {
        // インベントリ内にリカバリーコンパスを持っていない間は表示しない（固定キーは保持）
        pinnedWp = null;
      }
    } else if (
      isPlayerHoldingRecoveryCompass(player) &&
      state.recoveryCompassDeathOnly
    ) {
      // 死亡地点のみ表示モード中は通常ウェイポイントの固定表示も一時停止
      pinnedWp = null;
    }
  }

  if (isHolding) {
    // 1. 付近（WAYPOINT_PROXIMITY_RANGE内）でウェイポイントの方向を向いている場合:
    // シフトの有無にかかわらず、操作（トグル）対象となる最寄りウェイポイントを最優先でHUD表示
    const nearbyTarget = getNearbyToggleableWaypoint(player, headLoc, viewDir);
    if (nearbyTarget) {
      activeWaypoint = nearbyTarget.waypoint;
      isPinnedActive =
        pinnedWp !== null &&
        getWaypointKey(activeWaypoint) === state.pinnedWaypointKey;
    } else if (player.isSneaking) {
      // 2. コンパスを持ってスニーク中: 視野角15度以内の最寄りウェイポイントを検出（固定選択プレビュー）
      const closestHit = findRayClosestWaypoint(
        virtHead,
        viewDir,
        player.dimension.id,
        player,
      );
      if (closestHit) {
        activeWaypoint = closestHit.waypoint;
        isPinnedActive =
          pinnedWp !== null &&
          getWaypointKey(activeWaypoint) === state.pinnedWaypointKey;
      } else if (pinnedWp) {
        activeWaypoint = pinnedWp;
        isPinnedActive = true;
      }
    } else if (pinnedWp) {
      // 3. 通常時（非スニーク）: 固定中のウェイポイントを表示
      activeWaypoint = pinnedWp;
      isPinnedActive = true;
    }
  } else if (pinnedWp) {
    // コンパス非所持時でも固定中なら表示（インベントリ内にリカバリーコンパスがあれば死亡地点も表示）
    activeWaypoint = pinnedWp;
    isPinnedActive = true;
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
  } else if (activeWaypoint) {
    const actionTag = isPinnedActive && isHolding ? "§6[固定]" : "";
    const text = formatWaypointHUDText(
      player,
      activeWaypoint,
      actionTag,
      isZoomed,
    );
    try {
      player.onScreenDisplay.setActionBar(text);
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

/**
 * アイテムにシルクタッチのエンチャントが付与されているか判定
 */
export function hasSilkTouchEnchantment(
  itemStack: ItemStack | undefined,
): boolean {
  if (!itemStack) return false;
  try {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return false;
    return enchantable.hasEnchantment("silk_touch");
  } catch {
    return false;
  }
}

/**
 * シルクタッチ付きツールを持ってウェイポイントに近接（4m以内・対象を向く）して右クリックした場合の削除処理:
 * - 対象があればウェイポイント・マーカーを削除し、固定解除・通知・サウンド再生を行う
 * - 削除が行われた場合は true を返し、beforeEvents をキャンセルする
 */
export function handleSilkTouchWaypointDelete(
  player: Player,
  itemStack: ItemStack,
  cancelCallback?: () => void,
): boolean {
  if (!(player instanceof Player) || !player.isValid) return false;
  if (!hasSilkTouchEnchantment(itemStack)) return false;

  const currentTick = system.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);

  // 連打・多重発火防止 (10 tick = 0.5秒)
  if (currentTick - state.lastSilkTouchDeleteTick < 10) {
    cancelCallback?.();
    return true;
  }

  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());

  // 近接（4m以内かつ30度以内）の対象ウェイポイントを検索
  const nearbyTarget = getNearbyToggleableWaypoint(player, headLoc, viewDir);
  if (!nearbyTarget) {
    return false;
  }

  // 削除処理を実行
  cancelCallback?.();
  state.lastSilkTouchDeleteTick = currentTick;

  const targetWp = nearbyTarget.waypoint;
  const wpPos = { ...targetWp.pos };
  const dim = player.dimension;
  const deletedKey = getWaypointKey(targetWp);

  deleteWaypoint(dim, targetWp.pos);

  if (state.pinnedWaypointKey === deletedKey) {
    state.pinnedWaypointKey = null;
  }

  // ネームタグマーカーエンティティを削除
  removeWaypointMarker(dim, deletedKey, targetWp.pos);

  const deletedDisplayName = getWaypointDisplayName(targetWp);

  try {
    player.sendMessage(`§c[Waypoint] §f${deletedDisplayName} §cを削除しました`);
    player.onScreenDisplay.setActionBar(
      `§c[Waypoint] §f${deletedDisplayName} §cを削除しました`,
    );
    if (targetWp.source !== "death") {
      world.sendMessage(
        `§c[Waypoint] §f${deletedDisplayName} §cが ${player.name} によって削除されました`,
      );
    }
  } catch {}

  system.run(() => {
    try {
      if (player && player.isValid) {
        player.playSound("random.break", { pitch: 1.2, volume: 1.0 });
      }
      dim.playSound("random.break", wpPos, { pitch: 1.2, volume: 1.0 });
    } catch {}
  });

  return true;
}
