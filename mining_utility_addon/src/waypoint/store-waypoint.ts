import { world, Dimension, Vector3 } from "@minecraft/server";
import { BannerColorName, Waypoint } from "./waypoint.types";

// 保存用のデータ型
type SavedWaypoints = Record<string, Waypoint>;

// プロパティキー
const STORAGE_KEY = "waypoints";

// メモリ上で保持する Map
export const waypoints = new Map<string, Waypoint>();

export let waypointCache: Waypoint[] = [];

// 配列キャッシュを更新する内部関数
function updateCache(): void {
  waypointCache = Array.from(waypoints.values());
}

// ディメンションIDのプレフィックスを除去（"minecraft:overworld" -> "overworld"）
function formatDimId(dimId: string): string {
  return dimId.replace(/^minecraft:/, "");
}

// 座標とディメンションから一意なキーを作成
function createWaypointId(dim: string, pos: Vector3): string {
  const shortDim = formatDimId(dim);
  const x = Math.floor(pos.x);
  const y = Math.floor(pos.y);
  const z = Math.floor(pos.z);
  return `${shortDim}@${x},${y},${z}`;
}

/**
 * 指定した座標（同ディメンション・同整数ブロック座標）に既にウェイポイントが存在するか判定
 */
export function hasWaypointAt(
  dimension: Dimension | string,
  location: Vector3,
): boolean {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);
  return waypoints.has(id);
}

// --- 型ガード（JSON.parse の安全性を担保） ---
function isWaypoint(value: unknown): value is Waypoint {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Record<string, unknown>;
  const pos = candidate.pos as Record<string, unknown> | undefined;

  return (
    typeof candidate.dim === "string" &&
    typeof candidate.color === "string" &&
    (candidate.name === null || typeof candidate.name === "string") &&
    (candidate.creatorId === undefined || typeof candidate.creatorId === "string") &&
    (candidate.createdAt === undefined || typeof candidate.createdAt === "string") &&
    typeof pos === "object" &&
    pos !== null &&
    typeof pos.x === "number" &&
    typeof pos.y === "number" &&
    typeof pos.z === "number"
  );
}

// 内部用：永続化処理
function saveToStorage(): void {
  try {
    const plainObj: SavedWaypoints = Object.fromEntries(waypoints);
    world.setDynamicProperty(STORAGE_KEY, JSON.stringify(plainObj));
  } catch (e) {
    console.error(`[Waypoints] 保存に失敗しました:`, e);
  }
}

// ===================================================
// 1. ロード処理（ワールド起動時などに実行）
// ===================================================
export function loadWaypoints(): void {
  waypoints.clear();

  try {
    const rawData = world.getDynamicProperty(STORAGE_KEY);
    if (typeof rawData !== "string") {
      updateCache();
      return;
    }

    const parsed: unknown = JSON.parse(rawData);

    if (typeof parsed !== "object" || parsed === null) {
      updateCache();
      return;
    }

    // 読み込んだオブジェクトを型チェックしながら Map に復元
    for (const [key, value] of Object.entries(parsed)) {
      if (isWaypoint(value)) {
        waypoints.set(key, value);
      }
    }
    updateCache();
    console.warn(`[Waypoints] ロード完了: ${waypoints.size} 件のウェイポイントを復元しました。`);
  } catch (e) {
    console.warn(`[Waypoints] パースまたはロードに失敗しました:`, e);
    updateCache();
  }
}

// ===================================================
// 2. 追加・更新処理
// ===================================================
export function addWaypoint(
  dimension: Dimension | string,
  location: Vector3,
  color: BannerColorName,
  name: string | null,
  creatorId?: string,
  createdAt?: string,
): Waypoint {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);

  const newWaypoint: Waypoint = {
    dim: formatDimId(dimId),
    pos: {
      x: location.x,
      y: location.y,
      z: location.z,
    },
    color,
    name,
    creatorId,
    createdAt: createdAt ?? new Date().toISOString(),
  };

  // メモリに追加（既存の同座標データがあれば上書き）
  waypoints.set(id, newWaypoint);
  updateCache();

  // 永続化
  saveToStorage();

  return newWaypoint;
}

// ===================================================
// 3. 削除処理
// ===================================================
export function deleteWaypoint(
  dimension: Dimension | string,
  location: Vector3,
): boolean {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);

  const existed = waypoints.delete(id);
  updateCache();

  if (existed) {
    // データが存在して削除できた時のみセーブを走らせる
    saveToStorage();
  }

  return existed;
}
