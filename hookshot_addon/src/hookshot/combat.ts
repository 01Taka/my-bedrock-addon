import {
  EntityHitEntityAfterEvent,
  Player,
  EntityDamageCause,
  Vector3,
} from "@minecraft/server";
import { HOOKSHOT_BLAST_CONFIG, HookshotBlastConfig } from "./config";
import { isHoldingHookshot } from "./blast-jump";

/**
 * フックショットを持った状態でのエンティティ攻撃ハンドラー
 */
export function handleHookshotEntityHit(
  event: EntityHitEntityAfterEvent,
  config: HookshotBlastConfig = HOOKSHOT_BLAST_CONFIG,
): boolean {
  const damagingEntity = event.damagingEntity;
  const hitEntity = event.hitEntity;

  // 攻撃者がプレイヤーか
  if (!(damagingEntity instanceof Player)) return false;

  // メインハンドにフックショットを持っているか
  if (!isHoldingHookshot(damagingEntity)) return false;

  // 攻撃対象が有効かつ引き寄せタグを持っているか
  if (!hitEntity.isValid || !hitEntity.hasTag(config.PULLED_TAG)) return false;

  // 引き寄せタグを消費
  try {
    hitEntity.removeTag(config.PULLED_TAG);
  } catch {
    // 例外防止
  }

  // 大ダメージを与える (16ダメージ = 8ハート)
  try {
    hitEntity.applyDamage(config.FINISHER_DAMAGE, {
      damagingEntity,
      cause: EntityDamageCause.entityAttack,
    });
  } catch {
    // 例外防止
  }

  // プレイヤーの視線方向への強力なノックバックを計算
  const viewDir = damagingEntity.getViewDirection();
  const viewDistHoriz = Math.hypot(viewDir.x, viewDir.z);

  const fwdX = viewDistHoriz > 0.0001 ? viewDir.x / viewDistHoriz : 0;
  const fwdZ = viewDistHoriz > 0.0001 ? viewDir.z / viewDistHoriz : 0;

  const impulseX = fwdX * config.FINISHER_KNOCKBACK_FORCE;
  const impulseY = config.FINISHER_VERTICAL_LIFT;
  const impulseZ = fwdZ * config.FINISHER_KNOCKBACK_FORCE;

  try {
    hitEntity.applyImpulse({
      x: impulseX,
      y: impulseY,
      z: impulseZ,
    });
  } catch {
    // 例外防止
  }

  // モブの位置に爆発エフェクトとサウンドを発生
  try {
    const targetLoc = hitEntity.location;
    const effectPos: Vector3 = {
      x: targetLoc.x,
      y: targetLoc.y + 0.5,
      z: targetLoc.z,
    };
    damagingEntity.dimension.spawnParticle(config.PARTICLE_ID, effectPos);
    damagingEntity.playSound(config.SOUND_ID, {
      volume: config.SOUND_VOLUME,
      pitch: 0.9,
    });
  } catch {
    // 例外防止
  }

  return true;
}
