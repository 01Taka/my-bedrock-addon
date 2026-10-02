import { Vector3 } from "@minecraft/server";

// 対象とするたいまつとそれぞれの明るさレベル (0〜15)
export const TORCH_LIGHT_LEVELS: Record<string, number> = {
  "minecraft:torch": 14, // 通常のたいまつ
  "minecraft:soul_torch": 10, // 魂のたいまつ
  "minecraft:copper_torch": 14, // 銅のたいまつ
  "minecraft:redstone_torch": 7, // レッドストーンたいまつ
};

// プレイヤーごとに「直前に置いたライトブロックの情報（明るさレベル含む）」を記録するデータ型
export interface ActiveLightData {
  dimensionId: string;
  level: number;
  locations: Vector3[];
}

// たいまつ持ち替えのクールダウンtick数（約0.35秒）
export const SWAP_COOLDOWN_TICKS = 7;
