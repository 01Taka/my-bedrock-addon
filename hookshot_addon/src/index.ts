import { system } from "@minecraft/server";
import { initManualHookshot } from "./manual-hookshot";
import { handleSettingsScriptEvent } from "./settings";

// 初期化
system.run(() => {
  console.warn("§a[Manual Hookshot Addon] 手動巻取りフックショットアドオンが正常にロードされました。");
});

// 手動巻取り式フックショットの初期化
initManualHookshot();

// スクリプトイベントコマンド (/scriptevent manual_hookshot:... /scriptevent hookshot:... /scriptevent addon:autosneak)
system.afterEvents.scriptEventReceive.subscribe((event) => {
  try {
    handleSettingsScriptEvent(event);
  } catch (error) {
    console.error("マニュアルフックショット設定イベント処理エラー:", error);
  }
});
