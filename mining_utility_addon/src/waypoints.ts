import {
  world,
  system,
  Player,
  Entity,
  Vector3,
  EquipmentSlot,
  EntityEquippableComponent,
  PlayerInteractWithBlockBeforeEvent,
  PlayerPlaceBlockAfterEvent,
  MolangVariableMap,
  ScriptEventCommandMessageAfterEvent,
} from "@minecraft/server";

export interface ColorRGB {
  r: number;
  g: number;
  b: number;
  nameJa: string;
  chatCode: string;
}

export const BANNER_COLORS: Record<string, ColorRGB> = {
  white: { r: 1.0, g: 1.0, b: 1.0, nameJa: "白", chatCode: "§f" },
  orange: { r: 0.98, g: 0.53, b: 0.11, nameJa: "橙", chatCode: "§6" },
  magenta: { r: 0.83, g: 0.31, b: 0.75, nameJa: "赤紫", chatCode: "§d" },
  light_blue: { r: 0.23, g: 0.7, b: 0.85, nameJa: "空色", chatCode: "§b" },
  yellow: { r: 0.99, g: 0.86, b: 0.17, nameJa: "黄", chatCode: "§e" },
  lime: { r: 0.5, g: 0.78, b: 0.12, nameJa: "黄緑", chatCode: "§a" },
  pink: { r: 0.95, g: 0.6, b: 0.69, nameJa: "桃", chatCode: "§d" },
  gray: { r: 0.28, g: 0.31, b: 0.33, nameJa: "灰", chatCode: "§8" },
  light_gray: { r: 0.62, g: 0.62, b: 0.59, nameJa: "薄灰", chatCode: "§7" },
  cyan: { r: 0.09, g: 0.61, b: 0.62, nameJa: "青緑", chatCode: "§3" },
  purple: { r: 0.53, g: 0.2, b: 0.72, nameJa: "紫", chatCode: "§5" },
  blue: { r: 0.24, g: 0.31, b: 0.67, nameJa: "青", chatCode: "§9" },
  brown: { r: 0.51, g: 0.33, b: 0.2, nameJa: "茶", chatCode: "§6" },
  green: { r: 0.36, g: 0.49, b: 0.15, nameJa: "緑", chatCode: "§2" },
  red: { r: 0.69, g: 0.18, b: 0.15, nameJa: "赤", chatCode: "§c" },
  black: { r: 0.15, g: 0.15, b: 0.18, nameJa: "黒", chatCode: "§8" },
};

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

export function setHudMarkerMinSize(minSize: number): void {
  HUD_MARKER_CONFIG.minSize = Math.max(0.01, minSize);
}

export interface Waypoint {
  id: string; // dimensionId:x,y,z
  dimensionId: string;
  x: number;
  y: number;
  z: number;
  name: string; // プレイヤー命名（金床等）がない場合は空文字
  color: ColorRGB;
  entity?: Entity;
}

// 登録されているウェイポイント一覧 (キー: dimensionId:x,y,z)
export const activeWaypoints = new Map<string, Waypoint>();

// プレイヤーごとの全表示/非表示フラグ (デフォルト: true)
const playerWaypointsVisible = new Map<string, boolean>();

// プレイヤーごとの手前HUDネームタグ追従エンティティ
const playerHudEntities = new Map<string, Entity>();

// 旗設置前インタラクション情報（手持ちアイテムのID・名前・ローカライズキーを保持）
interface PendingBannerInfo {
  itemTypeId: string;
  nameTag?: string;
  localizationKey?: string;
  tick: number;
}
const pendingBannerPlacements = new Map<string, PendingBannerInfo>();

/**
 * 旗アイテムの typeId / localizationKey から色を特定
 */
export function extractBannerColor(typeId: string, locKey?: string): ColorRGB {
  const combined = `${typeId.toLowerCase()} ${(locKey || "").toLowerCase()}`;

  if (combined.includes("light_blue") || combined.includes("lightblue"))
    return BANNER_COLORS.light_blue;
  if (
    combined.includes("light_gray") ||
    combined.includes("lightgray") ||
    combined.includes("silver")
  )
    return BANNER_COLORS.light_gray;
  if (combined.includes("lime")) return BANNER_COLORS.lime;
  if (combined.includes("magenta")) return BANNER_COLORS.magenta;
  if (combined.includes("orange")) return BANNER_COLORS.orange;
  if (combined.includes("yellow")) return BANNER_COLORS.yellow;
  if (combined.includes("pink")) return BANNER_COLORS.pink;
  if (combined.includes("cyan")) return BANNER_COLORS.cyan;
  if (combined.includes("purple")) return BANNER_COLORS.purple;
  if (combined.includes("blue")) return BANNER_COLORS.blue;
  if (combined.includes("brown")) return BANNER_COLORS.brown;
  if (combined.includes("green")) return BANNER_COLORS.green;
  if (combined.includes("red")) return BANNER_COLORS.red;
  if (combined.includes("black")) return BANNER_COLORS.black;
  if (combined.includes("gray")) return BANNER_COLORS.gray;
  if (combined.includes("white")) return BANNER_COLORS.white;

  return BANNER_COLORS.white;
}

/**
 * ウェイポイント機能の初期化
 */
export function initWaypoints(): void {
  // プレイヤー離脱時の状態クリーンアップ
  world.afterEvents.playerLeave.subscribe((event) => {
    playerWaypointsVisible.delete(event.playerId);
    pendingBannerPlacements.delete(event.playerId);
    const hud = playerHudEntities.get(event.playerId);
    if (hud && hud.isValid) {
      try {
        hud.remove();
      } catch {}
    }
    playerHudEntities.delete(event.playerId);
  });

  // 1. 実体マーカーのネームタグ維持 & パーティクル描画ループ (10 tick = 約0.5秒ごと)
  system.runInterval(() => {
    if (activeWaypoints.size === 0) return;

    const players = world.getAllPlayers();

    for (const [key, wp] of activeWaypoints) {
      try {
        const dimension = world.getDimension(wp.dimensionId);

        // 実体マーカーエンティティが存在しない、または無効化されている場合は再生成
        if (!wp.entity || !wp.entity.isValid) {
          wp.entity = dimension.spawnEntity("mining_utility:waypoint_marker", {
            x: wp.x + 0.5,
            y: wp.y + 0.1,
            z: wp.z + 0.5,
          });
        }

        // 名前が付けられている場合のみ実体マーカーにネームタグを表示
        if (wp.name && wp.name.trim().length > 0) {
          let minDistance: number | null = null;
          for (const player of players) {
            if (player.dimension.id !== wp.dimensionId) continue;
            const dx = player.location.x - (wp.x + 0.5);
            const dy = player.location.y - (wp.y + 0.5);
            const dz = player.location.z - (wp.z + 0.5);
            const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
            if (minDistance === null || dist < minDistance) {
              minDistance = dist;
            }
          }

          const distanceText =
            minDistance !== null ? ` §6[§f${minDistance}m§6]` : "";
          wp.entity.nameTag = `${wp.color.chatCode}◆ ${wp.name}${distanceText}\n§7(${wp.x}, ${wp.y}, ${wp.z})`;
        } else {
          wp.entity.nameTag = "";
        }

        // 近くのマーカー位置に旗色のパーティクルを描画
        const molang = new MolangVariableMap();
        molang.setFloat("variable.color_r", wp.color.r);
        molang.setFloat("variable.color_g", wp.color.g);
        molang.setFloat("variable.color_b", wp.color.b);
        molang.setColorRGB("variable.color", {
          red: wp.color.r,
          green: wp.color.g,
          blue: wp.color.b,
        });

        dimension.spawnParticle(
          "mining_utility:waypoint_marker",
          {
            x: wp.x + 0.5,
            y: wp.y + 1.2,
            z: wp.z + 0.5,
          },
          molang,
        );
      } catch {
        // ディメンション未ロード等はスキップ
      }
    }
  }, 10);

  // 2. 手前投影マーカー（HUDプロジェクション）ループ (3 tick = 約0.15秒ごと)
  system.runInterval(() => {
    if (activeWaypoints.size === 0) return;

    for (const player of world.getAllPlayers()) {
      // プレイヤーが表示OFFにしている場合は描画しない
      const isVisible = playerWaypointsVisible.get(player.id) ?? true;
      if (!isVisible) continue;

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

          // 2m未満の至近距離は実体表示で十分なためスキップ
          if (dist < 2.0) continue;

          // 投影距離
          const projDist = HUD_MARKER_CONFIG.projectionDistance;
          const projX = headLoc.x + (dx / dist) * projDist;
          const projY = headLoc.y + (dy / dist) * projDist;
          const projZ = headLoc.z + (dz / dist) * projDist;

          // 相似比に基づく見かけサイズ
          const apparentSize = HUD_MARKER_CONFIG.baseSize * (projDist / dist);
          const finalSize = Math.max(HUD_MARKER_CONFIG.minSize, apparentSize);

          const molang = new MolangVariableMap();
          molang.setFloat("variable.marker_size", finalSize);
          molang.setFloat("variable.color_r", wp.color.r);
          molang.setFloat("variable.color_g", wp.color.g);
          molang.setFloat("variable.color_b", wp.color.b);
          molang.setColorRGB("variable.color", {
            red: wp.color.r,
            green: wp.color.g,
            blue: wp.color.b,
          });

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
      } catch {}
    }
  }, 3);

  // 3. 視線検知による手前ネームタグ表示 & アクションバー表示ループ (4 tick = 約0.2秒ごと)
  system.runInterval(() => {
    for (const player of world.getAllPlayers()) {
      const isVisible = playerWaypointsVisible.get(player.id) ?? true;
      if (!isVisible || activeWaypoints.size === 0) {
        clearHudEntity(player);
        continue;
      }

      // 素手判定
      const equippable = player.getComponent("minecraft:equippable") as
        | EntityEquippableComponent
        | undefined;
      const mainHandItem = equippable?.getEquipment(EquipmentSlot.Mainhand);
      const isBareHand =
        !mainHandItem || mainHandItem.typeId === "minecraft:air";

      // 要求3: 「素手の状態でシフトしながら自分の周りのウェイポイントの方に視線を向けると、そのWPの名前を手前にも表示」
      if (isBareHand && player.isSneaking) {
        const lookedAt = getLookedAtWaypoint(player, 18.0);
        if (lookedAt) {
          const { waypoint: wp, distance } = lookedAt;
          const displayName = wp.name ? wp.name : wp.color.nameJa;
          // アクションバーに大きく表示
          player.onScreenDisplay.setActionBar(
            `${wp.color.chatCode}◆ ${displayName} §6[${distance}m] §7(${wp.x}, ${wp.y}, ${wp.z})`,
          );

          // 旗自体に名前が付けられていた場合のみ手前ネームタグを表示
          if (wp.name && wp.name.trim().length > 0) {
            updateHudEntity(player, wp, distance);
          } else {
            clearHudEntity(player);
          }
          continue;
        }
      }

      // 視線を合わせていない、または条件外のときは手前ネームタグをクリア
      clearHudEntity(player);

      // 通常時: 最寄りのウェイポイントへのナビゲーションをアクションバーに表示
      let closestWp: Waypoint | null = null;
      let closestDist: number | null = null;

      for (const [_, wp] of activeWaypoints) {
        if (wp.dimensionId !== player.dimension.id) continue;
        const dx = wp.x + 0.5 - player.location.x;
        const dy = wp.y + 0.5 - player.location.y;
        const dz = wp.z + 0.5 - player.location.z;
        const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
        if (closestDist === null || dist < closestDist) {
          closestDist = dist;
          closestWp = wp;
        }
      }

      if (closestWp && closestDist !== null) {
        const arrow = getDirectionArrow(
          player,
          closestWp.x + 0.5,
          closestWp.z + 0.5,
        );
        const displayName = closestWp.name
          ? closestWp.name
          : closestWp.color.nameJa;
        player.onScreenDisplay.setActionBar(
          `${closestWp.color.chatCode}◆ ${displayName} §6${closestDist}m §a[${arrow}]`,
        );
      }
    }
  }, 4);
}

/**
 * プレイヤーの手前（1.5m先）に追従するネームタグエンティティを更新
 */
function updateHudEntity(player: Player, wp: Waypoint, distance: number): void {
  try {
    const headLoc = player.getHeadLocation();
    const viewDir = player.getViewDirection();
    // プレイヤーの視線前方 1.5m の位置
    const spawnPos = {
      x: headLoc.x + viewDir.x * 1.5,
      y: headLoc.y + viewDir.y * 1.5 - 0.3, // 目線より少し下に調整
      z: headLoc.z + viewDir.z * 1.5,
    };

    let hud = playerHudEntities.get(player.id);
    if (!hud || !hud.isValid) {
      hud = player.dimension.spawnEntity(
        "mining_utility:waypoint_marker",
        spawnPos,
      );
      playerHudEntities.set(player.id, hud);
    } else {
      hud.teleport(spawnPos, { dimension: player.dimension });
    }

    hud.nameTag = `${wp.color.chatCode}◆ ${wp.name}\n§6[${distance}m]`;
  } catch {}
}

/**
 * 手前追従ネームタグエンティティをクリア
 */
function clearHudEntity(player: Player): void {
  const hud = playerHudEntities.get(player.id);
  if (hud && hud.isValid) {
    hud.nameTag = "";
  }
}

/**
 * プレイヤーから指定距離以内で、最も向いている方向にあるウェイポイントを取得
 */
export function getTargetWaypointWithinDistance(
  player: Player,
  maxDistance: number = 3.0,
  maxAngleDegrees: number = 45.0,
): Waypoint | null {
  const headLoc = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  let closestWp: Waypoint | null = null;
  let closestDist = maxDistance;
  const minDot = Math.cos((maxAngleDegrees * Math.PI) / 180);

  for (const [_, wp] of activeWaypoints) {
    if (wp.dimensionId !== player.dimension.id) continue;
    const target = { x: wp.x + 0.5, y: wp.y + 0.5, z: wp.z + 0.5 };
    const dx = target.x - headLoc.x;
    const dy = target.y - headLoc.y;
    const dz = target.z - headLoc.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist > maxDistance) continue;

    const normX = dx / dist;
    const normY = dy / dist;
    const normZ = dz / dist;
    const dot = viewDir.x * normX + viewDir.y * normY + viewDir.z * normZ;

    if (dot >= minDot && dist < closestDist) {
      closestDist = dist;
      closestWp = wp;
    }
  }

  return closestWp;
}

/**
 * 視線が向いている方向にあるウェイポイントを取得（距離不問・レティクル付近判定）
 */
export function getLookedAtWaypoint(
  player: Player,
  maxAngleDegrees: number = 18.0,
): { waypoint: Waypoint; distance: number } | null {
  const headLoc = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  const minDot = Math.cos((maxAngleDegrees * Math.PI) / 180);

  let bestWp: Waypoint | null = null;
  let bestDot = minDot;
  let bestDist = 0;

  for (const [_, wp] of activeWaypoints) {
    if (wp.dimensionId !== player.dimension.id) continue;
    const target = { x: wp.x + 0.5, y: wp.y + 0.5, z: wp.z + 0.5 };
    const dx = target.x - headLoc.x;
    const dy = target.y - headLoc.y;
    const dz = target.z - headLoc.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < 1.0) continue;

    const normX = dx / dist;
    const normY = dy / dist;
    const normZ = dz / dist;
    const dot = viewDir.x * normX + viewDir.y * normY + viewDir.z * normZ;

    if (dot > bestDot) {
      bestDot = dot;
      bestWp = wp;
      bestDist = Math.round(dist);
    }
  }

  return bestWp ? { waypoint: bestWp, distance: bestDist } : null;
}

/**
 * ウェイポイントの作成
 */
export function createWaypoint(
  dimensionId: string,
  x: number,
  y: number,
  z: number,
  color: ColorRGB,
  name?: string,
): Waypoint {
  const key = `${dimensionId}:${x},${y},${z}`;
  const wpName = name?.trim() || "";

  let entity: Entity | undefined;
  try {
    const dimension = world.getDimension(dimensionId);
    entity = dimension.spawnEntity("mining_utility:waypoint_marker", {
      x: x + 0.5,
      y: y + 0.1,
      z: z + 0.5,
    });
    // プレイヤーが名前を付けていた場合のみネームタグを表示
    if (wpName) {
      entity.nameTag = `${color.chatCode}◆ ${wpName}\n§7(${x}, ${y}, ${z})`;
    } else {
      entity.nameTag = "";
    }
  } catch {}

  const waypoint: Waypoint = {
    id: key,
    dimensionId,
    x,
    y,
    z,
    name: wpName,
    color,
    entity,
  };

  activeWaypoints.set(key, waypoint);
  return waypoint;
}

/**
 * ウェイポイントの削除
 */
export function deleteWaypoint(id: string): boolean {
  const wp = activeWaypoints.get(id);
  if (!wp) return false;

  if (wp.entity && wp.entity.isValid) {
    try {
      wp.entity.remove();
    } catch {}
  }

  activeWaypoints.delete(id);
  return true;
}

/**
 * 全ウェイポイントの表示・非表示の切り替え
 */
export function toggleWaypointsVisibility(player: Player): boolean {
  const current = playerWaypointsVisible.get(player.id) ?? true;
  const next = !current;
  playerWaypointsVisible.set(player.id, next);

  if (next) {
    player.sendMessage(
      "§a[Waypoint] ウェイポイントの表示を【有効】にしました。",
    );
    player.playSound("random.orb", { volume: 0.8, pitch: 1.2 });
  } else {
    player.sendMessage(
      "§7[Waypoint] ウェイポイントの表示を【非表示】にしました。",
    );
    player.playSound("random.pop", { volume: 0.8, pitch: 0.8 });
    clearHudEntity(player);
    player.onScreenDisplay.setActionBar("");
  }

  return next;
}

/**
 * 旗ブロック設置イベントハンドラー (シフトしながら旗を置いた時にマーカーを作成)
 */
export function handleWaypointBlockPlace(
  event: PlayerPlaceBlockAfterEvent,
): void {
  const { player, block } = event;
  const blockTypeId = block.typeId.toLowerCase();

  // 旗ブロック（standing_banner または wall_banner）の設置でなければ無視
  if (!blockTypeId.includes("banner")) return;

  // プレイヤーがシフト（スニーク）していない場合はマーカーを設置しない
  if (!player.isSneaking) {
    pendingBannerPlacements.delete(player.id);
    return;
  }

  // 直前の設置前インタラクション情報から旗の情報を取得
  const pending = pendingBannerPlacements.get(player.id);
  pendingBannerPlacements.delete(player.id);

  let bannerTypeId = pending?.itemTypeId || "";
  let nameTag = pending?.nameTag;
  let locKey = pending?.localizationKey;

  // pending が無い場合のフォールバック（手持ちメインハンド/オフハンドの旗を確認）
  if (!bannerTypeId) {
    const equippable = player.getComponent("minecraft:equippable") as
      | EntityEquippableComponent
      | undefined;
    const mainItem = equippable?.getEquipment(EquipmentSlot.Mainhand);
    const offItem = equippable?.getEquipment(EquipmentSlot.Offhand);
    const item =
      mainItem && mainItem.typeId.toLowerCase().includes("banner")
        ? mainItem
        : offItem && offItem.typeId.toLowerCase().includes("banner")
          ? offItem
          : undefined;

    if (item) {
      bannerTypeId = item.typeId;
      nameTag = nameTag || item.nameTag;
      locKey = locKey || item.localizationKey;
    }
  }

  // 旗の色を特定
  const color = extractBannerColor(bannerTypeId, locKey);

  // 金床などで旗自体に命名されていた場合のネームタグ
  const customName = nameTag && nameTag.trim().length > 0 ? nameTag.trim() : "";

  // 同一座標に既に存在する場合は一度削除して再作成
  const key = `${player.dimension.id}:${block.x},${block.y},${block.z}`;
  if (activeWaypoints.has(key)) {
    deleteWaypoint(key);
  }

  createWaypoint(
    player.dimension.id,
    block.x,
    block.y,
    block.z,
    color,
    customName,
  );

  if (customName) {
    player.sendMessage(
      `§e[Waypoint] ${color.chatCode}「${customName}」§e (${color.nameJa}) のウェイポイントを設置しました！ §7(${block.x}, ${block.y}, ${block.z})`,
    );
  } else {
    player.sendMessage(
      `§e[Waypoint] ${color.chatCode}${color.nameJa}§e色のウェイポイントを設置しました！ §7(${block.x}, ${block.y}, ${block.z})`,
    );
  }

  player.playSound("random.orb", { volume: 0.8, pitch: 1.0 });
}

/**
 * ブロック右クリック前イベント処理
 * 1. 旗を持っている場合は設置情報を記録（シフト時のみ）
 * 2. 素手+シフトで3m以内のWPに向かって右クリック: WP削除
 * 3. 素手+シフトでその他の場所を右クリック: 全WP表示切り替え
 */
export function handleWaypointBlockInteract(
  event: PlayerInteractWithBlockBeforeEvent,
): void {
  const player = event.player;

  // 1. 手持ちアイテムが旗の場合、設置前情報を記録
  const item = event.itemStack;
  if (item) {
    const itemTypeId = item.typeId.toLowerCase();
    const locKey = (item.localizationKey || "").toLowerCase();
    const isBanner = itemTypeId.includes("banner") || locKey.includes("banner");

    if (isBanner) {
      if (player.isSneaking) {
        pendingBannerPlacements.set(player.id, {
          itemTypeId: item.typeId,
          nameTag: item.nameTag,
          localizationKey: item.localizationKey,
          tick: system.currentTick,
        });
      } else {
        pendingBannerPlacements.delete(player.id);
      }
      // 旗の設置を妨げないためイベントはキャンセルしない
      return;
    }
  }

  // シフト（スニーク）していなければ以降の操作は行わない
  if (!player.isSneaking) return;

  const equippable = player.getComponent("minecraft:equippable") as
    | EntityEquippableComponent
    | undefined;
  const mainHandItem = equippable?.getEquipment(EquipmentSlot.Mainhand);
  const isBareHand = !mainHandItem || mainHandItem.typeId === "minecraft:air";

  // 素手でない場合は何もしない
  if (!isBareHand) return;

  // 2. 素手シフトで3m以内のウェイポイントに向かって右クリック (削除)
  const targetWp = getTargetWaypointWithinDistance(player, 3.0, 45.0);
  if (targetWp) {
    event.cancel = true;
    const displayName = targetWp.name ? targetWp.name : targetWp.color.nameJa;
    const colorCode = targetWp.color.chatCode;
    deleteWaypoint(targetWp.id);

    player.sendMessage(
      `§c[Waypoint] ウェイポイント「${colorCode}${displayName}§c」を削除しました。`,
    );
    player.playSound("random.break", { volume: 0.8, pitch: 1.2 });
    return;
  }

  // 3. 素手シフトでその他のブロックを右クリック (全表示/非表示切り替え)
  event.cancel = true;
  toggleWaypointsVisibility(player);
}

/**
 * プレイヤーの向きと目的地方向から相対的な矢印アイコンを取得
 */
function getDirectionArrow(
  player: Player,
  targetX: number,
  targetZ: number,
): string {
  try {
    const dx = targetX - player.location.x;
    const dz = targetZ - player.location.z;
    if (Math.abs(dx) < 1 && Math.abs(dz) < 1) return "★";

    let targetAngle = (Math.atan2(dx, -dz) * 180) / Math.PI;
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
 * /scriptevent による最小サイズ設定
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
