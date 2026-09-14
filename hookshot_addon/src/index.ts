import {
  world,
  system,
  InputButton,
  ButtonState,
} from "@minecraft/server";
import {
  handleHookshotUse,
  updateBlastHud,
  handleBlastJumpButtonInput,
  handlePlayerGroundTouch,
  setJumpButtonReleasedInAir,
  handleHookshotEntityHit,
  handleBlastJumpDamage,
  updateFallDamageImmunity,
  isHoldingHookshot,
} from "./hookshot";
import { initManualHookshot } from "./manual-hookshot";
import { handleSettingsScriptEvent } from "./settings";

// 初期化
system.run(() => {
  console.warn("§a[Hookshot Addon] フックショットアドオンが正常にロードされました。");
});

// 手動巻取り式フックショットの初期化
initManualHookshot();

// アイテム使用 (フックショット)
world.beforeEvents.itemUse.subscribe((event) => {
  handleHookshotUse(event, () => {
    event.cancel = true;
  });
});

// ボタン入力（空中でフックショット所持時のジャンプキーで爆風ジャンプ）
// ※ 実験的機能（Beta APIs）が有効な環境のみ登録。無効な環境でもスクリプトが停止しないよう安全に保護
try {
  (world.afterEvents as any).playerButtonInput?.subscribe((event: any) => {
    handleBlastJumpButtonInput(event);
  });
} catch (e) {
  // 実験的機能が無効な環境ではスキップ
}

// ダメージ判定前（爆風ジャンプ後の落下ダメージ無効化）
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

// スクリプトイベントコマンド (/scriptevent hookshot:... /scriptevent addon:autosneak)
system.afterEvents.scriptEventReceive.subscribe((event) => {
  try {
    handleSettingsScriptEvent(event);
  } catch (error) {
    console.error("フックショット設定イベント処理エラー:", error);
  }
});
