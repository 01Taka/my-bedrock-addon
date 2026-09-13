import {
  world,
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
  GRAVE_OTHERS: "setting_grave_others",
  AUTO_SNEAK: "setting_auto_sneak",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface PlayerSettings {
  tree: boolean;
  ore: boolean;
  torch: boolean;
  grave: boolean;
  graveOthers: boolean;
  autoSneak: boolean;
}

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
 * プレイヤーの特定の設定値を取得（未設定時はデフォルト true）
 */
export function isSettingEnabled(
  player: Player,
  key: SettingKey,
  defaultValue: boolean = true,
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
 * プレイヤーのフックショット常時スニーク（常時巻取り）設定を取得（未設定時はデフォルト false）
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
 * プレイヤーの全設定を取得
 */
export function getPlayerSettings(player: Player): PlayerSettings {
  return {
    tree: isSettingEnabled(player, SETTING_KEYS.TREE),
    ore: isSettingEnabled(player, SETTING_KEYS.ORE),
    torch: isSettingEnabled(player, SETTING_KEYS.TORCH),
    grave: isSettingEnabled(player, SETTING_KEYS.GRAVE),
    graveOthers: isSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS),
    autoSneak: isAutoSneakEnabled(player),
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
  form.toggle("他人の墓の回収 (他人の墓石を開ける)", {
    defaultValue: current.graveOthers,
  });
  form.toggle("フックショット常時巻取り (Switch等の操作補助)", {
    defaultValue: current.autoSneak,
  });

  form
    .show(player)
    .then((response) => {
      if (response.canceled || !response.formValues) return;

      const [
        treeVal,
        oreVal,
        torchVal,
        graveVal,
        graveOthersVal,
        autoSneakVal,
      ] = response.formValues as [
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
      ];

      setSettingEnabled(player, SETTING_KEYS.TREE, treeVal);
      setSettingEnabled(player, SETTING_KEYS.ORE, oreVal);
      setSettingEnabled(player, SETTING_KEYS.TORCH, torchVal);
      setSettingEnabled(player, SETTING_KEYS.GRAVE, graveVal);
      setSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS, graveOthersVal);
      setSettingEnabled(player, SETTING_KEYS.AUTO_SNEAK, autoSneakVal);
      world.gameRules.keepInventory = graveVal;

      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");

      player.sendMessage(
        `§a============================\n` +
          `§6【アドオン設定を更新しました】\n` +
          `§f・木の破壊: ${statusText(treeVal)}\n` +
          `・鉱石の破壊: ${statusText(oreVal)}\n` +
          `・オフハンドたいまつ: ${statusText(torchVal)}\n` +
          `・墓機能: ${statusText(graveVal)}\n` +
          `・他人の墓の回収: ${statusText(graveOthersVal)}\n` +
          `・フックショット常時巻取り: ${statusText(autoSneakVal)}\n` +
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
 * - /scriptevent addon:autosneak
 * - /scriptevent addon autosneak
 * - /scriptevent addon:menu
 * - /scriptevent addon menu
 */
export function handleSettingsScriptEvent(
  event: ScriptEventCommandMessageAfterEvent,
): void {
  const rawId = (event.id || "").trim().toLowerCase();
  const rawMsg = (event.message || "").trim().toLowerCase();

  // コマンド名と引数を抽出
  let cmd = "";
  let arg = "";

  if (rawId.startsWith("addon:")) {
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

  // それでも見つからない場合（チャットからのサーバー実行等）、ログイン中の全プレイヤーを対象
  if (targets.length === 0) {
    targets = allOnlinePlayers;
  }

  if (targets.length === 0) {
    world.sendMessage("§c[Hookshot設定] ログイン中のプレイヤーが見つかりませんでした。");
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

    case "tree": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.TREE);

      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.TREE, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
        p.sendMessage(
          `§6[設定] 木の破壊 (一括伐採) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[設定] 木の破壊 (一括伐採) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      break;
    }

    case "ore": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.ORE);

      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.ORE, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
        p.sendMessage(
          `§6[設定] 鉱石の破壊 (一括採掘) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[設定] 鉱石の破壊 (一括採掘) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      break;
    }

    case "torch": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.TORCH);

      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.TORCH, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
        p.sendMessage(
          `§6[設定] オフハンドたいまつ を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[設定] オフハンドたいまつ を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      break;
    }

    case "grave": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.GRAVE);

      world.gameRules.keepInventory = next;
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.GRAVE, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
        p.sendMessage(
          `§6[設定] 墓機能 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[設定] 墓機能 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      break;
    }

    case "grave_others":
    case "graveothers": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.GRAVE_OTHERS);

      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.GRAVE_OTHERS, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
        p.sendMessage(
          `§6[設定] 他人の墓の回収 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[設定] 他人の墓の回収 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
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
          `§6[設定] フックショット常時巻取り を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `§6[設定] フックショット常時巻取り を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
        );
      }
      break;
    }

    case "status": {
      const settings = getPlayerSettings(primaryPlayer);
      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");
      const statusMsg =
        `§a============================\n` +
        `§6【現在の機能設定】\n` +
        `§f・木の破壊: ${statusText(settings.tree)}\n` +
        `・鉱石の破壊: ${statusText(settings.ore)}\n` +
        `・オフハンドたいまつ: ${statusText(settings.torch)}\n` +
        `・墓機能: ${statusText(settings.grave)}\n` +
        `・他人の墓の回収: ${statusText(settings.graveOthers)}\n` +
        `・フックショット常時巻取り: ${statusText(settings.autoSneak)}\n` +
        `§7(/scriptevent addon:menu で設定画面を開く)\n` +
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
        `§6【アドオンコマンド一覧】\n` +
        `§f・/scriptevent addon:menu : 設定画面を開く\n` +
        `・/scriptevent addon:autosneak : フックショット常時巻取りのON/OFF切り替え\n` +
        `・/scriptevent addon:tree : 木の破壊のON/OFF切り替え\n` +
        `・/scriptevent addon:ore : 鉱石の破壊のON/OFF切り替え\n` +
        `・/scriptevent addon:torch : オフハンドたいまつのON/OFF切り替え\n` +
        `・/scriptevent addon:grave : 墓機能のON/OFF切り替え\n` +
        `・/scriptevent addon:grave_others : 他人の墓の回収のON/OFF切り替え\n` +
        `・/scriptevent addon:status : 現在の設定状態を確認\n` +
        `§7※ 時計(Clock)またはコンパス(Compass)を持って画面長押し/右クリックでも設定画面が開きます。\n` +
        `§a============================`;
      for (const p of targets) {
        p.sendMessage(helpMsg);
      }
      if (isServerSource) {
        world.sendMessage(helpMsg);
      }
      break;
    }

    default: {
      const unknownMsg =
        `§e[アドオン設定] コマンド「${cmd}」は認識されませんでした。\n` +
        `§7利用可能: /scriptevent addon:autosneak, /scriptevent addon:menu, /scriptevent addon:help 等`;
      for (const p of targets) {
        p.sendMessage(unknownMsg);
      }
      if (isServerSource) {
        world.sendMessage(unknownMsg);
      }
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
  if (!(player instanceof Player)) return;

  const item = event.itemStack;
  if (!item) return;

  // 時計・コンパスなら通常使用で開く
  // 棒・羽・紙ならスニーク使用で開く
  const isClockOrCompass =
    item.typeId === "minecraft:clock" ||
    item.typeId === "minecraft:compass";

  const isSneakTool =
    player.isSneaking &&
    (item.typeId === "minecraft:stick" ||
      item.typeId === "minecraft:feather" ||
      item.typeId === "minecraft:paper");

  if (isClockOrCompass || isSneakTool) {
    cancelCallback();
    system.run(() => {
      showSettingsForm(player);
    });
  }
}
