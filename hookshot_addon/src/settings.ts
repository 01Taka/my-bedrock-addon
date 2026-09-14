import {
  world,
  Player,
  system,
  ScriptEventCommandMessageAfterEvent,
  ItemUseBeforeEvent,
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

export const SETTING_KEYS = {
  AUTO_SNEAK: "setting_auto_sneak",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

// メモリ内フォールバック（DynamicPropertyが取得・保存できない環境用の安全対策）
const memorySettingsFallback = new Map<string, Map<string, boolean>>();

function getPlayerMemoryMap(player: Player): Map<string, boolean> {
  const key = player.id || player.name || "default";
  let map = memorySettingsFallback.get(key);
  if (!map) {
    map = new Map<string, boolean>();
    memorySettingsFallback.set(key, map);
  }
  return map;
}

/**
 * プレイヤーの特定の設定値を取得（未設定時はデフォルト値）
 */
export function isSettingEnabled(
  player: Player,
  key: SettingKey,
  defaultValue: boolean = false,
): boolean {
  try {
    const val = player.getDynamicProperty(key);
    if (typeof val === "boolean") {
      return val;
    }
  } catch (e) {
    // 取得失敗時はフォールバック参照
  }
  const memMap = getPlayerMemoryMap(player);
  if (memMap.has(key)) {
    return memMap.get(key)!;
  }
  return defaultValue;
}

/**
 * プレイヤーの手動巻取りフックショット常時スニーク（常時巻取り）設定を取得（未設定時はデフォルト false）
 */
export function isAutoSneakEnabled(player: Player): boolean {
  return isSettingEnabled(player, SETTING_KEYS.AUTO_SNEAK, false);
}

/**
 * プレイヤーの設定値を保存
 */
export function setSettingEnabled(
  player: Player,
  key: SettingKey,
  enabled: boolean,
): void {
  try {
    player.setDynamicProperty(key, enabled);
  } catch (e) {
    console.error(`設定保存エラー [${key}]:`, e);
  }
  getPlayerMemoryMap(player).set(key, enabled);
}

/**
 * 設定UI（ModalForm）を表示
 */
export function showSettingsForm(player: Player): void {
  const currentAutoSneak = isAutoSneakEnabled(player);

  const form = new ModalFormData();
  form.title("§l§6手動巻取りフックショット設定");
  form.toggle("常時巻取り (Switch等の操作補助)", {
    defaultValue: currentAutoSneak,
  });

  form
    .show(player)
    .then((response) => {
      if (response.canceled || !response.formValues) return;

      const [autoSneakVal] = response.formValues as [boolean];
      setSettingEnabled(player, SETTING_KEYS.AUTO_SNEAK, autoSneakVal);

      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");

      player.sendMessage(
        `§a============================\n` +
          `§6【手動巻取りフックショット設定を更新しました】\n` +
          `§f・常時巻取り: ${statusText(autoSneakVal)}\n` +
          `§a============================`,
      );
    })
    .catch((error) => {
      console.error("設定UI表示エラー:", error);
    });
}

/**
 * /scriptevent による設定変更・UI表示ハンドラー
 * 対応形式:
 * - /scriptevent manual_hookshot:autosneak [on|off]
 * - /scriptevent manual_hookshot:menu
 * - /scriptevent hookshot:autosneak (互換用)
 * - /scriptevent hookshot:menu (互換用)
 * - /scriptevent addon:autosneak (互換用)
 */
export function handleSettingsScriptEvent(
  event: ScriptEventCommandMessageAfterEvent,
): void {
  const rawId = (event.id || "").trim().toLowerCase();
  const rawMsg = (event.message || "").trim().toLowerCase();

  // コマンド名と引数を抽出
  let cmd = "";
  let arg = "";

  if (rawId.startsWith("manual_hookshot:")) {
    cmd = rawId.substring(16).trim();
    arg = rawMsg;
  } else if (rawId.startsWith("manualhookshot:")) {
    cmd = rawId.substring(15).trim();
    arg = rawMsg;
  } else if (rawId === "manual_hookshot" || rawId === "manualhookshot") {
    const parts = rawMsg.split(/\s+/);
    cmd = parts[0] || "";
    arg = parts.slice(1).join(" ").trim();
  } else if (rawId.startsWith("hookshot:")) {
    cmd = rawId.substring(9).trim();
    arg = rawMsg;
  } else if (rawId === "hookshot") {
    const parts = rawMsg.split(/\s+/);
    cmd = parts[0] || "";
    arg = parts.slice(1).join(" ").trim();
  } else if (rawId.startsWith("addon:")) {
    cmd = rawId.substring(6).trim();
    arg = rawMsg;
  } else if (rawId === "addon") {
    const parts = rawMsg.split(/\s+/);
    cmd = parts[0] || "";
    arg = parts.slice(1).join(" ").trim();
  } else {
    cmd = rawId;
    arg = rawMsg;
  }

  // 関係のないコマンドは無視
  const validCmds = ["menu", "setting", "settings", "config", "ui", "autosneak", "auto_sneak", "sneak", "status", "help"];
  if (!validCmds.includes(cmd)) {
    return;
  }

  // 対象プレイヤーリストの決定
  const allOnlinePlayers = world.getAllPlayers();
  let targets: Player[] = [];

  if (
    event.sourceEntity &&
    (event.sourceEntity instanceof Player ||
      (event.sourceEntity as any).typeId === "minecraft:player")
  ) {
    targets = [event.sourceEntity as Player];
  } else if (arg) {
    const targetName = arg.split(/\s+/)[0];
    const found = allOnlinePlayers.find(
      (p) => p.name.toLowerCase() === targetName.toLowerCase(),
    );
    if (found) {
      targets = [found];
      arg = arg.substring(targetName.length).trim();
    }
  }

  if (targets.length === 0) {
    targets = allOnlinePlayers;
  }

  if (targets.length === 0) {
    return;
  }

  const primaryPlayer = targets[0];
  const isServerSource = !(event.sourceEntity instanceof Player);

  switch (cmd) {
    case "menu":
    case "setting":
    case "settings":
    case "config":
    case "ui": {
      system.run(() => {
        showSettingsForm(primaryPlayer);
      });
      break;
    }

    case "autosneak":
    case "auto_sneak":
    case "sneak": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isAutoSneakEnabled(primaryPlayer);

      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.AUTO_SNEAK, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
        p.sendMessage(
          `§6[手動巻取りフックショット設定] 常時巻取り を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[手動巻取りフックショット設定] 常時巻取り を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      break;
    }

    case "status": {
      const autoSneak = isAutoSneakEnabled(primaryPlayer);
      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");
      const statusMsg =
        `§a============================\n` +
          `§6【手動巻取りフックショット設定】\n` +
          `§f・常時巻取り: ${statusText(autoSneak)}\n` +
          `§7(/scriptevent manual_hookshot:menu で設定画面を開く)\n` +
          `§a============================`;
      for (const p of targets) {
        p.sendMessage(statusMsg);
      }
      if (isServerSource) {
        world.sendMessage(statusMsg);
      }
      break;
    }

    case "help": {
      const helpMsg =
        `§a============================\n` +
          `§6【手動巻取りフックショット コマンド一覧】\n` +
          `§f・/scriptevent manual_hookshot:menu : 設定画面を開く\n` +
          `・/scriptevent manual_hookshot:autosneak : 常時巻取りのON/OFF切り替え\n` +
          `・/scriptevent manual_hookshot:status : 現在の設定状態を確認\n` +
          `§a============================`;
      for (const p of targets) {
        p.sendMessage(helpMsg);
      }
      if (isServerSource) {
        world.sendMessage(helpMsg);
      }
      break;
    }
  }
}

/**
 * アイテム使用時の設定UI補助（必要に応じて）
 */
export function handleSettingsItemUse(
  event: ItemUseBeforeEvent,
  cancelCallback: () => void,
): void {
  // 基本は /scriptevent manual_hookshot:menu で開ける
}
