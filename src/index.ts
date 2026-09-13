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
  handleBlastJumpFallDamage,
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

// 爆風ジャンプ後の落下ダメージ軽減・無効化（ウィンドチャージ仕様）
world.beforeEvents.entityHurt.subscribe((event) => {
  handleBlastJumpFallDamage(event);
});

// エンティティ攻撃（フックショットで引き寄せたモブへのフィニッシャー攻撃）
world.afterEvents.entityHitEntity.subscribe((event) => {
  handleHookshotEntityHit(event);
});

// 定期監視ループ（着地による初期化 ＆ アクションバーHUD更新）
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

