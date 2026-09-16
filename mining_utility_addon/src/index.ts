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
import { handleSettingsScriptEvent, handleSettingsItemUse } from "./settings";
import {
  initWaypoints,
  handleWaypointScriptEvent,
  handleWaypointBlockInteract,
  handleWaypointBlockPlace,
} from "./waypoints";
import "./map";
export * from "./waypoint-utils";

// 初期化
system.run(() => {
  try {
    world.gameRules.keepInventory = true;
  } catch {}
  initWaypoints();
  console.warn(
    "§a[Mining & Utility Addon] 採掘・墓・たいまつ・ウェイポイント機能が正常にロードされました。",
  );
});

// プレイヤー復活時の座標メモ紙付与
world.afterEvents.playerSpawn.subscribe((event) => {
  handleGravePlayerSpawn(event);
});

// クリエイティブでの墓石誤破壊防止
world.beforeEvents.playerBreakBlock.subscribe((event) => {
  handleGraveBeforeBreak(event);
});

// ブロック一括破壊 (鉱石・木)
world.afterEvents.playerBreakBlock.subscribe((event) => {
  oreMassDestruction(event, ORE_BLOCK_IDS);
  treeMassDestruction(event);
});

// アイテム使用 (たいまつ持ち替え / 設定UI表示)
world.beforeEvents.itemUse.subscribe((event) => {
  handleSettingsItemUse(event, () => {
    event.cancel = true;
  });
  handleTorchSwap(event.source, () => {
    event.cancel = true;
  });
});

// 死亡検知 (墓生成)
world.afterEvents.entityDie.subscribe((event) => {
  handleGraveEntityDie(event);
});

// ブロックの右クリックインタラクション (墓石回収 / ウェイポイント操作)
world.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  handleGraveBeforeInteract(event);
  handleWaypointBlockInteract(event);
});

// ブロック設置 (シフトしながら旗を置いた時にウェイポイント作成)
world.afterEvents.playerPlaceBlock.subscribe((event) => {
  handleWaypointBlockPlace(event);
});

// スクリプトイベントコマンド (/scriptevent addon:... /scriptevent utility:...)
system.afterEvents.scriptEventReceive.subscribe((event) => {
  try {
    handleSettingsScriptEvent(event);
    handleWaypointScriptEvent(event);
  } catch (error) {
    console.error("イベント処理エラー:", error);
  }
});
