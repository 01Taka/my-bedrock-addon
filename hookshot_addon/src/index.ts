import { system } from "@minecraft/server";
import { initManualHookshot } from "./manual-hookshot";

// 初期化
system.run(() => {
  console.warn("§a[Hookshot Addon] フックショットアドオンが正常にロードされました。");
});

// フックショットの初期化
initManualHookshot();


