import { Vector3, Vector2 } from "@minecraft/server";

/**
 * プレイヤー移動に関する設定型
 */
export interface PlayerMovementConfig {
  /** 着弾可能な最大距離（ブロック単位） */
  MAX_DISTANCE: number;
  /** インパルス強度の最大値（ブロック換算。何ブロック分の距離の勢いを最大とするか） */
  MAX_IMPULSE_DISTANCE: number;
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
  /** Y軸方向の最低インパルス強度 */
  MIN_VERTICAL_IMPULSE: number;
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

/**
 * パーティクルエフェクトに関する設定型
 */
export interface HookshotParticleConfig {
  /** 軌道パーティクルのID */
  TRAIL_PARTICLE: string;
  /** 命中時パーティクルのID */
  HIT_PARTICLE: string;
  /** 軌道パーティクルの配置間隔（ブロック単位） */
  STEP_DISTANCE: number;
  /** 空振り時のパーティクル描画最大距離 */
  MISS_DISTANCE: number;
}

/**
 * 爆風ジャンプおよび引き寄せモブへの攻撃に関する設定型
 */
export interface HookshotBlastConfig {
  /** 爆風ジャンプの上昇インパルス強度 */
  UPWARD_IMPULSE: number;
  /** プレイヤーの入力（WASD/スティック）による水平方向インパルスの強度（設定で変更可能） */
  HORIZONTAL_INPUT_WEIGHT: number;
  /** 爆風ジャンプの最大速度制限 */
  MAX_IMPULSE_SPEED: number;
  /** 爆風パーティクルID */
  PARTICLE_ID: string;
  /** 爆風サウンドID */
  SOUND_ID: string;
  /** 爆風サウンド音量 */
  SOUND_VOLUME: number;
  /** 爆風サウンドピッチ */
  SOUND_PITCH: number;
  /** モブ引き寄せタグ名 */
  PULLED_TAG: string;
  /** モブ引き寄せタグの持続時間（tick単位: 20tick = 1秒） */
  PULL_TAG_DURATION_TICKS: number;
  /** 引き寄せモブへの攻撃ダメージ（16 = 8ハート分） */
  FINISHER_DAMAGE: number;
  /** 引き寄せモブへの視線方向ノックバック強度 */
  FINISHER_KNOCKBACK_FORCE: number;
  /** 引き寄せモブへのフィニッシャー攻撃時の上方向ノックバック補正 */
  FINISHER_VERTICAL_LIFT: number;
}

