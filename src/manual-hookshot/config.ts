/**
 * 手動巻取り式フックショットの設定パラメータ（即時着弾・軽量版）
 */
export const MANUAL_HOOKSHOT_CONFIG = {
  /** アイテムID */
  ITEM_ID: "addon:manual_hookshot",

  /** 最大射程距離（ブロック） */
  MAX_DISTANCE: 120,

  /** シフト巻取り時の1フレーム（tick）あたりインパルス強度 */
  PULL_IMPULSE: 0.35,

  /** 最大巻取り速度（ブロック/tick、空気抵抗との釣り合い終端速度） */
  MAX_WIND_SPEED: 2.0,

  /** 重力落下を緩和するための微小な上向きインパルス補正 */
  PULL_VERTICAL_BOOST: 0.07,

  /** 巻き取り開始時に下方向の落下速度をリセット（0に相殺）するかどうか */
  RESET_DOWNWARD_VELOCITY_ON_WIND_START: true,

  /** フック着弾後、1ピル溜まるのに必要なtick数（20tick=1秒。10tick=0.5秒。3ピルで30tick=1.5秒） */
  PILL_CHARGE_TICKS_PER_PILL: 4,

  /** 解除時の爆風＆インパルス発動に必要な最大ピル数 */
  PILL_MAX_COUNT: 3,

  /** 落下速度リセット＆爆発エフェクトが発動する下方向速度の閾値（ブロック/tick。0.5で約10m/s以上の落下） */
  RESET_DOWNWARD_VELOCITY_THRESHOLD: 0.1,

  /** 落下速度リセット時に付与する低速落下（slow_falling）の持続tick数（20tick=1秒。落下ダメージをリセット） */
  SLOW_FALLING_TICKS_ON_RESET: 2,

  /** 巻き取り開始時の爆風エフェクト＆サウンドのインターバル（tick、20tick=約1秒） */
  RESET_EXPLOSION_INTERVAL_TICKS: 20,

  /** 落下速度リセット時の爆発パーティクル */
  RESET_EXPLOSION_PARTICLE: "minecraft:explosion_particle",

  /** 落下速度リセット時のサウンドID */
  RESET_EXPLOSION_SOUND: "random.explode",

  /** 落下速度リセット時のサウンド音量 */
  RESET_EXPLOSION_SOUND_VOLUME: 0.8,

  /** 落下速度リセット時のサウンドピッチ */
  RESET_EXPLOSION_SOUND_PITCH: 1.4,

  /** 目標着弾点に到達したとみなす停止判定距離（ブロック） */
  STOP_DISTANCE: 1.5,

  /** 着弾時のインパクトパーティクル */
  HIT_PARTICLE: "minecraft:large_explosion",

  /**
   * プレイヤーと着弾点を結ぶロープパーティクル
   * 推奨: "minecraft:basic_crit_particle"（矢の軌跡。endrodと違い白光りせず視界を邪魔しない細い糸状）
   * 候補: "minecraft:electric_spark_particle"（青白い極小スパーク）
   *       "minecraft:candle_flame_particle"（小さな光点）
   */
  ROPE_PARTICLE: "minecraft:basic_crit_particle",

  /** ロープパーティクルの描画間隔（ブロック） */
  ROPE_STEP_DISTANCE: 0.6,

  /** 解除時の上方向ホップインパルス強度（木の上などに着地しやすくする） */
  RELEASE_UPWARD_IMPULSE: 0.8,

  /** 空中解除時に付与する低速落下（slow_falling）の持続tick数（20tick=1秒。落下ダメージをリセット） */
  SLOW_FALLING_TICKS_ON_RELEASE: 2,

  /** 解除時の小爆発パーティクル */
  RELEASE_PARTICLE: "minecraft:explosion_particle",

  /** 解除時のサウンドID */
  RELEASE_SOUND: "random.explode",

  /** 解除時のサウンド音量 */
  RELEASE_SOUND_VOLUME: 0.6,

  /** 解除時のサウンドピッチ */
  RELEASE_SOUND_PITCH: 1.8,
};
