import {
  world,
  system,
  Player,
  Entity,
  MolangVariableMap,
  ScriptEventCommandMessageAfterEvent,
} from "@minecraft/server";

export interface HudMarkerConfig {
  /** 本物のマーカーの実寸サイズ (ブロック単位, デフォルト 0.6) */
  baseSize: number;
  /** 手前投影距離 (ブロック単位, デフォルト 1.5) */
  projectionDistance: number;
  /** 最小マーカーサイズ (遠距離でもこれより小さくならない, デフォルト 0.08) */
  minSize: number;
}

export const HUD_MARKER_CONFIG: HudMarkerConfig = {
  baseSize: 0.6,
  projectionDistance: 1.5,
  minSize: 0.08,
};

/**
 * 手前投影マーカーの最小サイズを変更する
 * @param minSize 最小サイズ（0.01以上）
 */
export function setHudMarkerMinSize(minSize: number): void {
  HUD_MARKER_CONFIG.minSize = Math.max(0.01, minSize);
}

/**
 * /scriptevent によるウェイポイント設定変更ハンドラ
 * 例: /scriptevent addon:waypoint_minsize 0.05
 */
export function handleWaypointScriptEvent(
  event: ScriptEventCommandMessageAfterEvent,
): void {
  const id = event.id.toLowerCase();
  if (id === "addon:waypoint_minsize" || id === "utility:waypoint_minsize") {
    const val = parseFloat(event.message.trim());
    if (!isNaN(val) && val > 0) {
      setHudMarkerMinSize(val);
      world.sendMessage(
        `§a[Waypoint] 手前マーカーの最小サイズを ${HUD_MARKER_CONFIG.minSize} に変更しました。`,
      );
    }
  }
}

interface Waypoint {
  dimensionId: string;
  x: number;
  y: number;
  z: number;
  entity?: Entity;
}

// 登録されているウェイポイント (キー: dimensionId:x,y,z)
const activeWaypoints = new Map<string, Waypoint>();

// プレイヤーごとの直前のスニーク状態
const previousSneakStates = new Map<string, boolean>();

/**
 * ウェイポイント機能の初期化
 */
export function initWaypoints(): void {
  // プレイヤー離脱時の状態クリア
  world.afterEvents.playerLeave.subscribe((event) => {
    previousSneakStates.delete(event.playerId);
  });

  // シフト（スニーク開始）検知ループ (毎tick監視)
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const isSneaking = player.isSneaking;
      const wasSneaking = previousSneakStates.get(player.id) ?? false;
      previousSneakStates.set(player.id, isSneaking);

      // シフトを押した瞬間（立ち -> しゃがみ）
      if (isSneaking && !wasSneaking) {
        handleToggleWaypoint(player);
      }
    }
  }, 1);

  // マーカーネームタグ更新 & パーティクル & アクションバーナビゲーション (10 tick = 約0.5秒ごと)
  system.runInterval(() => {
    if (activeWaypoints.size === 0) return;

    const players = world.getAllPlayers();

    for (const [key, wp] of activeWaypoints) {
      try {
        const dimension = world.getDimension(wp.dimensionId);

        // エンティティが存在しない、または無効化されている場合は再生成
        if (!wp.entity || !wp.entity.isValid) {
          wp.entity = dimension.spawnEntity("mining_utility:waypoint_marker", {
            x: wp.x + 0.5,
            y: wp.y + 0.1,
            z: wp.z + 0.5,
          });
        }

        // 最も近いプレイヤーとの距離を計算
        let nearestPlayer: Player | null = null;
        let minDistance: number | null = null;

        for (const player of players) {
          if (player.dimension.id !== wp.dimensionId) continue;
          const dx = player.location.x - (wp.x + 0.5);
          const dy = player.location.y - (wp.y + 0.5);
          const dz = player.location.z - (wp.z + 0.5);
          const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
          if (minDistance === null || dist < minDistance) {
            minDistance = dist;
            nearestPlayer = player;
          }
        }

        // ネームタグに座標と距離を反映
        const distanceText =
          minDistance !== null ? ` §6[§f${minDistance}m§6]` : "";
        wp.entity.nameTag = `§e◆ ウェイポイント${distanceText}\n§7(${wp.x}, ${wp.y}, ${wp.z})`;

        // 近くのマーカー位置にパーティクルも描画
        try {
          dimension.spawnParticle("mining_utility:waypoint_marker", {
            x: wp.x + 0.5,
            y: wp.y + 1.2,
            z: wp.z + 0.5,
          });
        } catch {}
      } catch {
        // ディメンション未ロード等の場合はスキップ
      }
    }

    // 各プレイヤーのアクションバーに最寄りのウェイポイントの方角・距離を表示
    for (const player of players) {
      let closestWp: Waypoint | null = null;
      let closestDist: number | null = null;

      for (const [_, wp] of activeWaypoints) {
        if (wp.dimensionId !== player.dimension.id) continue;
        const dx = (wp.x + 0.5) - player.location.x;
        const dy = (wp.y + 0.5) - player.location.y;
        const dz = (wp.z + 0.5) - player.location.z;
        const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
        if (closestDist === null || dist < closestDist) {
          closestDist = dist;
          closestWp = wp;
        }
      }

      if (closestWp && closestDist !== null) {
        const arrow = getDirectionArrow(player, closestWp.x + 0.5, closestWp.z + 0.5);
        player.onScreenDisplay.setActionBar(
          `§e◆ WP §f(${closestWp.x}, ${closestWp.y}, ${closestWp.z}) §6${closestDist}m §a[${arrow}]`
        );
      }
    }
  }, 10);

  // 手前投影マーカー（HUD風プロジェクション）ループ (4 tick = 約0.2秒ごと)
  // プレイヤーの視線から1.5m前方の空間にウェイポイント方向のマーカーを描画（壁で遮られない）
  system.runInterval(() => {
    if (activeWaypoints.size === 0) return;

    for (const player of world.getAllPlayers()) {
      try {
        const headLoc = player.getHeadLocation();
        const dimension = player.dimension;

        for (const [_, wp] of activeWaypoints) {
          if (wp.dimensionId !== dimension.id) continue;

          const targetX = wp.x + 0.5;
          const targetY = wp.y + 0.5;
          const targetZ = wp.z + 0.5;

          const dx = targetX - headLoc.x;
          const dy = targetY - headLoc.y;
          const dz = targetZ - headLoc.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // 2m未満の至近距離の場合は実座標で十分なため手前投影をスキップ
          if (dist < 2.0) continue;

          // 投影距離
          const projDist = HUD_MARKER_CONFIG.projectionDistance;
          const projX = headLoc.x + (dx / dist) * projDist;
          const projY = headLoc.y + (dy / dist) * projDist;
          const projZ = headLoc.z + (dz / dist) * projDist;

          // 透視投影に基づく見かけの相似サイズ = 実寸 * (投影距離 / 実際距離)
          const apparentSize = HUD_MARKER_CONFIG.baseSize * (projDist / dist);
          // 設定された最小値（minSize）を下回らないようにクランプ
          const finalSize = Math.max(HUD_MARKER_CONFIG.minSize, apparentSize);

          const molang = new MolangVariableMap();
          molang.setFloat("variable.marker_size", finalSize);

          dimension.spawnParticle(
            "mining_utility:hud_marker",
            {
              x: projX,
              y: projY,
              z: projZ,
            },
            molang,
          );
        }
      } catch {
        // エラーハンドリング
      }
    }
  }, 4);
}

/**
 * プレイヤーの向きと目的地方向から相対的な矢印アイコンを取得
 */
function getDirectionArrow(player: Player, targetX: number, targetZ: number): string {
  try {
    const dx = targetX - player.location.x;
    const dz = targetZ - player.location.z;
    if (Math.abs(dx) < 1 && Math.abs(dz) < 1) return "★";

    // 目的地のワールド角度 (-180 ~ 180, 北が0度、東が-90、西が90)
    let targetAngle = (Math.atan2(dx, -dz) * 180) / Math.PI;
    // プレイヤーの視線角度 (-180 ~ 180)
    let playerYaw = player.getRotation().y;

    let diff = (targetAngle - playerYaw) % 360;
    if (diff < -180) diff += 360;
    if (diff > 180) diff -= 360;

    if (diff >= -22.5 && diff < 22.5) return "↑";
    if (diff >= 22.5 && diff < 67.5) return "↗";
    if (diff >= 67.5 && diff < 112.5) return "→";
    if (diff >= 112.5 && diff < 157.5) return "↘";
    if (diff >= -67.5 && diff < -22.5) return "↖";
    if (diff >= -112.5 && diff < -67.5) return "←";
    if (diff >= -157.5 && diff < -112.5) return "↙";
    return "↓";
  } catch {
    return "◆";
  }
}

/**
 * シフト押下時のウェイポイント追加/削除トグル処理
 */
function handleToggleWaypoint(player: Player): void {
  const dimension = player.dimension;
  const x = Math.floor(player.location.x);
  const y = Math.floor(player.location.y);
  const z = Math.floor(player.location.z);
  const key = `${dimension.id}:${x},${y},${z}`;

  if (activeWaypoints.has(key)) {
    // 既に同じ整数座標にある場合は削除
    const wp = activeWaypoints.get(key);
    if (wp?.entity && wp.entity.isValid) {
      try {
        wp.entity.remove();
      } catch {}
    }
    activeWaypoints.delete(key);

    player.onScreenDisplay.setActionBar(
      `§c[Waypoint] 削除しました: (${x}, ${y}, ${z})`
    );
    player.playSound("random.break", { volume: 0.8, pitch: 1.2 });
  } else {
    // 存在しない場合は新規生成
    try {
      const entity = dimension.spawnEntity("mining_utility:waypoint_marker", {
        x: x + 0.5,
        y: y + 0.1,
        z: z + 0.5,
      });
      entity.nameTag = `§e◆ ウェイポイント [0m]\n§7(${x}, ${y}, ${z})`;

      activeWaypoints.set(key, {
        dimensionId: dimension.id,
        x,
        y,
        z,
        entity,
      });

      player.onScreenDisplay.setActionBar(
        `§a[Waypoint] 生成しました: (${x}, ${y}, ${z})`
      );
      player.playSound("random.orb", { volume: 0.8, pitch: 1.0 });
    } catch (e) {
      player.sendMessage(`§c[Waypoint] マーカーの生成に失敗しました: ${e}`);
    }
  }
}
