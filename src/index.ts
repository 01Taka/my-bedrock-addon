import { world, system } from "@minecraft/server";
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
import { handleHookshotUse } from "./hookshot";

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

