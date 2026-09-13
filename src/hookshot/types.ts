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
  /** プレイヤーの横入力による偏向加算インパルスの重み */
  STEERING_WEIGHT: number;
  /** プレイヤーの後退入力による減速加算インパルスの重み */
  DISTANCE_DAMPING_WEIGHT: number;
  /** プレイヤーの前進入力による加速加算インパルスの重み */
  DISTANCE_BOOST_WEIGHT: number;
}

/**
 * モブ引き寄せに関する設定型
 */
export interface EntityPullConfig {
  /** 横方向の引き寄せインパルス係数 */
  HORIZONTAL_WEIGHT: number;
  /** Y座標差が閾値（2ブロック）以下のときの基本垂直インパルス（一定値） */
  BASE_VERTICAL_IMPULSE: number;
  /** 高低差に応じた垂直インパルス加算を開始するY座標差の閾値（ブロック単位） */
  HEIGHT_DIFF_THRESHOLD: number;
  /** 高低差が閾値を超えた場合に加算する垂直インパルス係数（1ブロックあたり） */
  HEIGHT_DIFF_VERTICAL_WEIGHT: number;
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
  /** 軌道パーティクルのID（エンドロッド光線ビーム） */
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
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 上方向インパルス強度 */
  PRE_HOOK_UPWARD_IMPULSE: number;
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  PRE_HOOK_DOWNWARD_INERTIA_RETENTION: number;
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 水平慣性の維持率（0.0: 完全リセット, 1.0: 減衰なし, 0.4: 40%維持） */
  PRE_HOOK_HORIZONTAL_INERTIA_RETENTION: number;
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  PRE_HOOK_HORIZONTAL_INPUT_WEIGHT: number;
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 最大速度制限 */
  PRE_HOOK_MAX_IMPULSE_SPEED: number;

  /** フックショット着弾後の爆風ジャンプ: 上方向インパルス強度 */
  POST_HOOK_UPWARD_IMPULSE: number;
  /** フックショット着弾後の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  POST_HOOK_DOWNWARD_INERTIA_RETENTION: number;
  /** フックショット着弾後の爆風ジャンプ: 水平慣性の維持率（0.0: 完全リセット, 1.0: 減衰なし, 0.6: 60%維持） */
  POST_HOOK_HORIZONTAL_INERTIA_RETENTION: number;
  /** フックショット着弾後の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  POST_HOOK_HORIZONTAL_INPUT_WEIGHT: number;
  /** フックショット着弾後の爆風ジャンプ: 最大速度制限 */
  POST_HOOK_MAX_IMPULSE_SPEED: number;

  /** 前入力時の水平速度減衰率（0.60 = 60%に減衰） */
  FORWARD_HORIZONTAL_RETENTION: number;
  /** 入力なし時の水平速度減衰率（0.15 = 15%に減衰） */
  NEUTRAL_HORIZONTAL_RETENTION: number;
  /** 後ろ入力時に移動方向と反対方向に与える水平インパルス強度 */
  BACKWARD_IMPULSE_FORCE: number;
  /** 静止状態での前入力時に与える水平推進インパルス強度 */
  FORWARD_IMPULSE_FORCE: number;
  /** 平行入力判定のデッドゾーンしきい値（スティック誤差許容） */
  PARALLEL_DEADZONE: number;

  /** 爆風パーティクルID（大爆発） */
  PARTICLE_ID: string;
  /** 風爆発パーティクルID */
  WIND_PARTICLE_ID?: string;
  /** 煙爆発パーティクルID */
  SMOKE_PARTICLE_ID?: string;
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
  /** 爆風ジャンプ発動地点からのYオフセット以下に到達してからの落下ダメージ無効化時間（tick単位: 40tick = 2秒） */
  FALL_DAMAGE_IMMUNITY_TICKS: number;
  /** 落下ダメージ無効化のカウントダウン開始Yオフセット（発動地点Y - この値 以下でカウントダウン開始。デフォルト: 3） */
  IMMUNITY_TRIGGER_Y_OFFSET: number;
  /** 落下ダメージ無効化終了時の通知パーティクルID */
  IMMUNITY_EXPIRE_PARTICLE: string;
  /** 落下ダメージ無効化終了時の通知サウンドID */
  IMMUNITY_EXPIRE_SOUND: string;
  /** 落下ダメージ無効化終了時のサウンド音量 */
  IMMUNITY_EXPIRE_SOUND_VOLUME: number;
  /** 落下ダメージ無効化終了時のサウンドピッチ */
  IMMUNITY_EXPIRE_SOUND_PITCH: number;
}

