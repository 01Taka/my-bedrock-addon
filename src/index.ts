import {
  world,
  system,
  InputButton,
  ButtonState,
  Player,
} from "@minecraft/server";
import {
  ORE_BLOCK_IDS,
  oreMassDestruction,
  treeMassDestruction,
} from "./mass-destruction";
import { handleTorchSwap } from "./offhand-touch";
import {
  handleGraveEntityDie,
  handleGraveBeforeInteract,
  handleGraveBeforeBreak,
  handleGravePlayerSpawn,
} from "./grave";
import {
  handleSettingsScriptEvent,
  handleSettingsItemUse,
} from "./settings";
import {
  handleHookshotUse,
  executeBlastJump,
  resetBlastJump,
  updateBlastHud,
  handleBlastJumpButtonInput,
  handlePlayerGroundTouch,
  setJumpButtonReleasedInAir,
  handleHookshotEntityHit,
  handleBlastJumpDamage,
  updateFallDamageImmunity,
  isHoldingHookshot,
} from "./hookshot";

// 初期化
system.run(() => {
  world.gameRules.keepInventory = true;
});

// プレイヤー復活時の座標メモ紙付与
world.afterEvents.playerSpawn.subscribe((event) => {
  handleGravePlayerSpawn(event);
});

// クリエイティブでの墓石誤破壊防止
world.beforeEvents.playerBreakBlock.subscribe((event) => {
  handleGraveBeforeBreak(event);
});

// ブロック一括破壊
world.afterEvents.playerBreakBlock.subscribe((event) => {
  oreMassDestruction(event, ORE_BLOCK_IDS);
  treeMassDestruction(event);
});

// アイテム使用 (たいまつ持ち替え / 設定UI表示 / フックショット)
world.beforeEvents.itemUse.subscribe((event) => {
  handleHookshotUse(event, () => {
    event.cancel = true;
  });
  handleSettingsItemUse(event, () => {
    event.cancel = true;
  });
  handleTorchSwap(event.source, () => {
    event.cancel = true;
  });
});

// ボタン入力（空中でフックショット所持時のジャンプキーで爆風ジャンプ）
world.afterEvents.playerButtonInput.subscribe((event) => {
  handleBlastJumpButtonInput(event);
});

// ダメージ判定前（爆風ジャンプ後の2秒間は落下ダメージ無効化）
world.beforeEvents.entityHurt.subscribe((event) => {
  handleBlastJumpDamage(event);
});

// エンティティ攻撃（フックショットで引き寄せたモブへのフィニッシャー攻撃）
world.afterEvents.entityHitEntity.subscribe((event) => {
  handleHookshotEntityHit(event);
});

// 定期監視ループ（着地による初期化 ＆ 落下ダメージ無効化更新 ＆ アクションバーHUD更新）
system.runInterval(() => {
  for (const player of world.getAllPlayers()) {
    if (!player.isValid) continue;

    // 地面に着地している場合
    if (player.isOnGround) {
      handlePlayerGroundTouch(player);
    } else {
      // 空中にいる場合、ジャンプボタンが押されていなければ空中でのリリース状態として記録（崖からの落下対応）
      try {
        if (
          player.inputInfo?.getButtonState(InputButton.Jump) ===
          ButtonState.Released
        ) {
          setJumpButtonReleasedInAir(player, true);
        }
      } catch {
        // フォールバック
      }

      // 落下ダメージ無効化状態の更新（発動時Y座標以下になってからのカウントダウン等）
      updateFallDamageImmunity(player, 2);
    }

    // フックショットを所持している場合はアクションバーHUDを更新
    if (isHoldingHookshot(player)) {
      updateBlastHud(player);
    }
  }
}, 2);

// 死亡検知
world.afterEvents.entityDie.subscribe((event) => {
  handleGraveEntityDie(event);
});

// 墓石の右クリック回収
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  handleGraveBeforeInteract(event);
});

// スクリプトイベントコマンド (/scriptevent addon:...)
system.afterEvents.scriptEventReceive.subscribe((event) => {
  handleSettingsScriptEvent(event);
});

