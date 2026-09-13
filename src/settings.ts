import {
  Player,
  system,
  ScriptEventCommandMessageAfterEvent,
  ItemUseBeforeEvent,
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

export const SETTING_KEYS = {
  TREE: "setting_tree",
  ORE: "setting_ore",
  TORCH: "setting_torch",
  GRAVE: "setting_grave",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface PlayerSettings {
  tree: boolean;
  ore: boolean;
  torch: boolean;
  grave: boolean;
}

/**
 * プレイヤーの特定の設定値を取得（未設定時はデフォルト true）
 */
export function isSettingEnabled(player: Player, key: SettingKey): boolean {
  try {
    const val = player.getDynamicProperty(key);
    if (typeof val === "boolean") {
      return val;
    }
  } catch (e) {
    // 取得失敗時はデフォルトON
  }
  return true;
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
}

/**
 * プレイヤーの全設定を取得
 */
export function getPlayerSettings(player: Player): PlayerSettings {
  return {
    tree: isSettingEnabled(player, SETTING_KEYS.TREE),
    ore: isSettingEnabled(player, SETTING_KEYS.ORE),
    torch: isSettingEnabled(player, SETTING_KEYS.TORCH),
    grave: isSettingEnabled(player, SETTING_KEYS.GRAVE),
  };
}

/**
 * 設定UI（ModalForm）を表示
 */
export function showSettingsForm(player: Player): void {
  const current = getPlayerSettings(player);

  const form = new ModalFormData();
  form.title("§l§6アドオン機能設定");
  form.toggle("木の破壊 (一括伐採)", { defaultValue: current.tree });
  form.toggle("鉱石の破壊 (一括採掘)", { defaultValue: current.ore });
  form.toggle("オフハンドたいまつ (動的光源・持ち替え)", {
    defaultValue: current.torch,
  });
  form.toggle("墓機能 (死亡時アイテム保護)", { defaultValue: current.grave });

  form
    .show(player)
    .then((response) => {
      if (response.canceled || !response.formValues) return;

      const [treeVal, oreVal, torchVal, graveVal] = response.formValues as [
        boolean,
        boolean,
        boolean,
        boolean,
      ];

      setSettingEnabled(player, SETTING_KEYS.TREE, treeVal);
      setSettingEnabled(player, SETTING_KEYS.ORE, oreVal);
      setSettingEnabled(player, SETTING_KEYS.TORCH, torchVal);
      setSettingEnabled(player, SETTING_KEYS.GRAVE, graveVal);

      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");

      player.sendMessage(
        `§a============================\n` +
          `§6【アドオン設定を更新しました】\n` +
          `§f・木の破壊: ${statusText(treeVal)}\n` +
          `・鉱石の破壊: ${statusText(oreVal)}\n` +
          `・オフハンドたいまつ: ${statusText(torchVal)}\n` +
          `・墓機能: ${statusText(graveVal)}\n` +
          `§a============================`,
      );
    })
    .catch((error) => {
      console.error("設定UI表示エラー:", error);
    });
}

/**
 * /scriptevent addon:<command> による設定変更・UI表示ハンドラー
 */
export function handleSettingsScriptEvent(
  event: ScriptEventCommandMessageAfterEvent,
): void {
  const source = event.sourceEntity;
  if (!(source instanceof Player)) return;

  const player = source;
  const id = event.id.toLowerCase();

  switch (id) {
    case "addon:menu":
    case "addon:setting":
    case "addon:settings":
    case "addon:config": {
      system.run(() => {
        showSettingsForm(player);
      });
      break;
    }

    case "addon:tree": {
      const next = !isSettingEnabled(player, SETTING_KEYS.TREE);
      setSettingEnabled(player, SETTING_KEYS.TREE, next);
      player.sendMessage(
        `§6[設定] 木の破壊 (一括伐採) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "addon:ore": {
      const next = !isSettingEnabled(player, SETTING_KEYS.ORE);
      setSettingEnabled(player, SETTING_KEYS.ORE, next);
      player.sendMessage(
        `§6[設定] 鉱石の破壊 (一括採掘) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "addon:torch": {
      const next = !isSettingEnabled(player, SETTING_KEYS.TORCH);
      setSettingEnabled(player, SETTING_KEYS.TORCH, next);
      player.sendMessage(
        `§6[設定] オフハンドたいまつ を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "addon:grave": {
      const next = !isSettingEnabled(player, SETTING_KEYS.GRAVE);
      setSettingEnabled(player, SETTING_KEYS.GRAVE, next);
      player.sendMessage(
        `§6[設定] 墓機能 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "addon:status": {
      const settings = getPlayerSettings(player);
      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");
      player.sendMessage(
        `§a============================\n` +
          `§6【現在の機能設定】\n` +
          `§f・木の破壊: ${statusText(settings.tree)}\n` +
          `・鉱石の破壊: ${statusText(settings.ore)}\n` +
          `・オフハンドたいまつ: ${statusText(settings.torch)}\n` +
          `・墓機能: ${statusText(settings.grave)}\n` +
          `§7(/scriptevent addon:menu で設定画面を開く)\n` +
          `§a============================`,
      );
      break;
    }

    case "addon:help": {
      player.sendMessage(
        `§a============================\n` +
          `§6【アドオンコマンド一覧】\n` +
          `§f・/scriptevent addon:menu : 設定画面を開く\n` +
          `・/scriptevent addon:tree : 木の破壊のON/OFF切り替え\n` +
          `・/scriptevent addon:ore : 鉱石の破壊のON/OFF切り替え\n` +
          `・/scriptevent addon:torch : オフハンドたいまつのON/OFF切り替え\n` +
          `・/scriptevent addon:grave : 墓機能のON/OFF切り替え\n` +
          `・/scriptevent addon:status : 現在の設定状態を確認\n` +
          `§7※ スニーク中に棒(Stick)または時計(Clock)を使用して設定画面を開くこともできます。\n` +
          `§a============================`,
      );
      break;
    }
  }
}

/**
 * スニーク中に特定のアイテム（棒や時計など）を使用した際に設定UIを開くハンドラー
 */
export function handleSettingsItemUse(
  event: ItemUseBeforeEvent,
  cancelCallback: () => void,
): void {
  const player = event.source;
  if (!player.isSneaking) return;

  const item = event.itemStack;
  if (!item) return;

  // 棒 (stick) または 時計 (clock) または コンパス (compass) をスニーク右クリックで設定画面を表示
  if (
    item.typeId === "minecraft:stick" ||
    item.typeId === "minecraft:clock" ||
    item.typeId === "minecraft:compass"
  ) {
    cancelCallback();
    system.run(() => {
      showSettingsForm(player);
    });
  }
}
