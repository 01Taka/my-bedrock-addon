import { Vector3, Vector2 } from "@minecraft/server";

/**
 * プレイヤー移動に関する設定型
 */
export interface PlayerMovementConfig {
  /** 着弾可能な最大距離（ブロック単位） */
  MAX_DISTANCE: number;
  /** 横方向の重み（インパルス強度の係数） */
  HORIZONTAL_WEIGHT: number;
  /** 縦方向の重み（インパルス強度の係数） */
  VERTICAL_WEIGHT: number;
  /** 着弾地点の高さオフセット */
  HEIGHT_OFFSET: number;
  /** プレイヤーの横入力による偏向の重み */
  STEERING_WEIGHT: number;
  /** プレイヤーの後退入力による減衰の重み */
  DISTANCE_DAMPING_WEIGHT: number;
  /** プレイヤーの前進入力による増幅の重み */
  DISTANCE_BOOST_WEIGHT: number;
}

/**
 * モブ引き寄せに関する設定型
 */
export interface EntityPullConfig {
  /** 横方向の引き寄せインパルス係数 */
  HORIZONTAL_WEIGHT: number;
  /** 縦方向の引き寄せインパルス（打ち上げ/浮遊成分） */
  VERTICAL_LIFT: number;
  /** 最大インパルス強度（過度な吹っ飛び防止） */
  MAX_IMPULSE_SPEED: number;
  /** プレイヤー手前で止めるためのオフセット距離（ブロック単位） */
  STOP_OFFSET_DISTANCE: number;
  /** 引き寄せ時のサウンドID */
  SOUND_ID: string;
  /** 引き寄せ時のサウンド音量 */
  SOUND_VOLUME: number;
  /** 引き寄せ時のサウンドピッチ */
  SOUND_PITCH: number;
}
