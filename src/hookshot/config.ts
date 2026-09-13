/**
 * フックショット アイテムID
 */
export const HOOKSHOT_ITEM_ID = "addon:hookshot";

/**
 * プレイヤー移動に関する設定
 */
export const PLAYER_MOVEMENT_CONFIG = {
  /** 着弾可能な最大距離（ブロック単位） */
  MAX_DISTANCE: 150,
  /** インパルス強度の最大値（ブロック換算。何ブロック分の距離の勢いを最大とするか） */
  MAX_IMPULSE_DISTANCE: 40,
  /** 横方向の重み（横方向の距離に対して加えるインパルス強度の係数） */
  HORIZONTAL_WEIGHT: 0.12,
  /** 縦方向の重み（縦方向の距離に対して加えるインパルス強度の係数） */
  VERTICAL_WEIGHT: 0.07,
  /** 高さオフセット（着弾地点の何マス上を目標とするか） */
  HEIGHT_OFFSET: 8,
  /** プレイヤーの横入力による偏向加算インパルスの重み */
  STEERING_WEIGHT: 0.9,
  /** プレイヤーの後退入力による減速加算インパルスの重み */
  DISTANCE_DAMPING_WEIGHT: 0.3,
  /** プレイヤーの前進入力による加速加算インパルスの重み */
  DISTANCE_BOOST_WEIGHT: 1.0,
};

/**
 * モブ引き寄せに関する設定
 */
export const ENTITY_PULL_CONFIG = {
  /** 横方向の引き寄せインパルス係数 */
  HORIZONTAL_WEIGHT: 0.2,
  /** Y座標差が閾値（2ブロック）以下のときの基本垂直インパルス（一定値） */
  BASE_VERTICAL_IMPULSE: 1.0,
  /** 高低差に応じた垂直インパルス加算を開始するY座標差の閾値（ブロック単位） */
  HEIGHT_DIFF_THRESHOLD: 0.5,
  /** 高低差が閾値を超えた場合に加算する垂直インパルス係数（1ブロックあたり） */
  HEIGHT_DIFF_VERTICAL_WEIGHT: 0.2,
  /** 最大インパルス強度（過度な吹っ飛び防止） */
  MAX_IMPULSE_SPEED: 2.5,
  /** プレイヤー手前で止めるためのオフセット距離（ブロック単位） */
  STOP_OFFSET_DISTANCE: 1.0,
  /** 引き寄せ時のサウンドID */
  SOUND_ID: "item.trident.return",
  /** 引き寄せ時のサウンド音量 */
  SOUND_VOLUME: 1.0,
  /** 引き寄せ時のサウンドピッチ */
  SOUND_PITCH: 1.2,
};

/**
 * 引き寄せ不可（代わりにプレイヤーが接近する）大型モブ・ボスのリスト
 */
export const HEAVY_ENTITY_TYPES: readonly string[] = [
  "minecraft:iron_golem",
  "minecraft:warden",
  "minecraft:ender_dragon",
  "minecraft:wither",
  "minecraft:elder_guardian",
  "minecraft:ravager",
  "minecraft:ghast",
];

/**
 * フックショットの対象から完全に除外するエンティティタイプ
 */
export const EXCLUDED_ENTITY_TYPES: readonly string[] = [
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
  "minecraft:armor_stand",
];

/**
 * パーティクルエフェクトに関する設定
 */
export const HOOKSHOT_PARTICLE_CONFIG = {
  /** 軌道パーティクルのID（エンドロッド光線ビーム） */
  TRAIL_PARTICLE: "minecraft:endrod",
  /** 命中時パーティクルのID */
  HIT_PARTICLE: "minecraft:endrod",
  /** 軌道パーティクルの配置間隔（ブロック単位） */
  STEP_DISTANCE: 0.25,
  /** 空振り時のパーティクル描画最大距離 */
  MISS_DISTANCE: 30,
};

/**
 * 爆風ジャンプおよび引き寄せモブへの攻撃に関する設定
 */
export const HOOKSHOT_BLAST_CONFIG = {
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 上方向インパルス強度 */
  PRE_HOOK_UPWARD_IMPULSE: 0.8,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  PRE_HOOK_DOWNWARD_INERTIA_RETENTION: 0.3,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  PRE_HOOK_HORIZONTAL_INPUT_WEIGHT: 0.75,
  /** 地面離脱後〜フックショット着弾前の爆風ジャンプ: 最大速度制限 */
  PRE_HOOK_MAX_IMPULSE_SPEED: 2.5,

  /** フックショット着弾後の爆風ジャンプ: 上方向インパルス強度 */
  POST_HOOK_UPWARD_IMPULSE: 1.2,
  /** フックショット着弾後の爆風ジャンプ: 落下(下方向)速度の維持率・倍率（0.0: 完全相殺, 1.0: 減速なし, 0.3: 30%に減速後に上昇力加算） */
  POST_HOOK_DOWNWARD_INERTIA_RETENTION: 0.3,
  /** フックショット着弾後の爆風ジャンプ: プレイヤー入力(WASD/スティック)による水平インパルス強度 */
  POST_HOOK_HORIZONTAL_INPUT_WEIGHT: 0.1,
  /** フックショット着弾後の爆風ジャンプ: 最大速度制限 */
  POST_HOOK_MAX_IMPULSE_SPEED: 3.0,

  /** 前入力時の水平速度減衰率（0.8 = 80%に減衰） */
  FORWARD_HORIZONTAL_RETENTION: 0.8,
  /** 入力なし時の水平速度減衰率（0.3 = 30%に減衰） */
  NEUTRAL_HORIZONTAL_RETENTION: 0.3,
  /** 後ろ入力時に移動方向と反対方向に与える水平インパルス強度 */
  BACKWARD_IMPULSE_FORCE: 0.6,
  /** 静止状態での前入力時に与える水平推進インパルス強度 */
  FORWARD_IMPULSE_FORCE: 0.5,
  /** 平行入力判定のデッドゾーンしきい値（スティック誤差許容） */
  PARALLEL_DEADZONE: 0.2,

  /** 爆風パーティクルID（大爆発） */
  PARTICLE_ID: "minecraft:huge_explosion_emitter",
  /** 風爆発パーティクルID */
  WIND_PARTICLE_ID: "minecraft:wind_explosion_emitter" as string | undefined,
  /** 煙爆発パーティクルID */
  SMOKE_PARTICLE_ID: "minecraft:explosion_particle" as string | undefined,
  /** 爆風サウンドID */
  SOUND_ID: "random.explode",
  /** 爆風サウンド音量 */
  SOUND_VOLUME: 1.0,
  /** 爆風サウンドピッチ */
  SOUND_PITCH: 1.2,
  /** モブ引き寄せタグ名 */
  PULLED_TAG: "hookshot:pulled",
  /** モブ引き寄せタグの持続時間（tick単位: 20tick = 1秒） */
  PULL_TAG_DURATION_TICKS: 20,
  /** 引き寄せモブへの攻撃ダメージ（16 = 8ハート分） */
  FINISHER_DAMAGE: 16,
  /** 引き寄せモブへの視線方向ノックバック強度 */
  FINISHER_KNOCKBACK_FORCE: 1.8,
  /** 引き寄せモブへのフィニッシャー攻撃時の上方向ノックバック補正 */
  FINISHER_VERTICAL_LIFT: 0.35,
  /** 爆風ジャンプ発動時のY座標以下に到達してからの落下ダメージ無効化時間（tick単位: 40tick = 2秒） */
  FALL_DAMAGE_IMMUNITY_TICKS: 40,
  /** 落下ダメージ無効化のカウントダウン開始Yオフセット（発動地点Y - この値 以下でカウントダウン開始。デフォルト: 3） */
  IMMUNITY_TRIGGER_Y_OFFSET: 3,
  /** 落下ダメージ無効化終了時の通知パーティクルID */
  IMMUNITY_EXPIRE_PARTICLE: "minecraft:smoke_particle",
  /** 落下ダメージ無効化終了時の通知サウンドID */
  IMMUNITY_EXPIRE_SOUND: "random.break",
  /** 落下ダメージ無効化終了時のサウンド音量 */
  IMMUNITY_EXPIRE_SOUND_VOLUME: 0.8,
  /** 落下ダメージ無効化終了時のサウンドピッチ */
  IMMUNITY_EXPIRE_SOUND_PITCH: 0.8,
};

/**
 * フックショット総合設定オブジェクト
 */
export const HOOKSHOT_CONFIG = {
  ITEM_ID: HOOKSHOT_ITEM_ID,
  movement: PLAYER_MOVEMENT_CONFIG,
  pull: ENTITY_PULL_CONFIG,
  heavyEntities: HEAVY_ENTITY_TYPES,
  excludedEntities: EXCLUDED_ENTITY_TYPES,
  particle: HOOKSHOT_PARTICLE_CONFIG,
  blast: HOOKSHOT_BLAST_CONFIG,
} as const;

// 定数から型を導出（型定義の二重管理を防止）
export type PlayerMovementConfig = typeof PLAYER_MOVEMENT_CONFIG;
export type EntityPullConfig = typeof ENTITY_PULL_CONFIG;
export type HeavyEntityTypes = typeof HEAVY_ENTITY_TYPES;
export type ExcludedEntityTypes = typeof EXCLUDED_ENTITY_TYPES;
export type HookshotParticleConfig = typeof HOOKSHOT_PARTICLE_CONFIG;
export type HookshotBlastConfig = typeof HOOKSHOT_BLAST_CONFIG;
export type HookshotConfig = typeof HOOKSHOT_CONFIG;
