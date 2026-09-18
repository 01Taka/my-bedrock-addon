import {
  world,
  Player,
  system,
  ScriptEventCommandMessageAfterEvent,
  ItemUseBeforeEvent,
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
import {
  getRecoveryCompassMode,
  setRecoveryCompassMode,
  getRecoveryCompassModeDescription,
  RecoveryCompassMode,
} from "./grave";

export const SETTING_KEYS = {
  TREE: "setting_tree",
  ORE: "setting_ore",
  TORCH: "setting_torch",
  GRAVE: "setting_grave",
  GRAVE_OTHERS: "setting_grave_others",
} as const;

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS];

export interface PlayerSettings {
  tree: boolean;
  ore: boolean;
  torch: boolean;
  grave: boolean;
  graveOthers: boolean;
}

// メモリ内フォールバック（DynamicPropertyが取得・保存できない環境用の安全対策）
const worldMemorySettings = new Map<string, boolean>();

/**
 * ワールド共通の設定値を取得（未設定時はデフォルト true）
 */
export function isSettingEnabled(
  _player?: Player | null,
  key: SettingKey = SETTING_KEYS.GRAVE,
  defaultValue: boolean = true,
): boolean {
  try {
    const val = world.getDynamicProperty(key);
    if (typeof val === "boolean") {
      return val;
    }
  } catch (e) {
    // 取得失敗時はフォールバック参照
  }
  if (worldMemorySettings.has(key)) {
    return worldMemorySettings.get(key)!;
  }
  return defaultValue;
}

/**
 * ワールド共通の設定値を保存
 */
export function setSettingEnabled(
  _player: Player | null,
  key: SettingKey,
  enabled: boolean,
): void {
  try {
    world.setDynamicProperty(key, enabled);
  } catch (e) {
    console.error(`設定保存エラー [${key}]:`, e);
  }
  worldMemorySettings.set(key, enabled);
}

/**
 * ワールド全体の全設定を取得
 */
export function getPlayerSettings(_player?: Player | null): PlayerSettings {
  return {
    tree: isSettingEnabled(null, SETTING_KEYS.TREE),
    ore: isSettingEnabled(null, SETTING_KEYS.ORE),
    torch: isSettingEnabled(null, SETTING_KEYS.TORCH),
    grave: isSettingEnabled(null, SETTING_KEYS.GRAVE),
    graveOthers: isSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS),
  };
}

/**
 * 設定UI（ModalForm）を表示
 */
export function showSettingsForm(player: Player): void {
  const current = getPlayerSettings(player);
  const currentCompassMode = getRecoveryCompassMode();

  const form = new ModalFormData();
  form.title("§l§6採掘・墓・たいまつ設定 (ワールド共通)");
  form.toggle("木の破壊 (一括伐採)", { defaultValue: current.tree });
  form.toggle("鉱石の破壊 (一括採掘)", { defaultValue: current.ore });
  form.toggle("オフハンドたいまつ (動的光源・持ち替え)", {
    defaultValue: current.torch,
  });
  form.toggle("墓機能 (死亡時アイテム保護)", { defaultValue: current.grave });
  form.toggle("他人の墓の回収 (他人の墓石を開ける)", {
    defaultValue: current.graveOthers,
  });
  form.dropdown(
    "リカバリーコンパスの扱い",
    [
      "lost: 墓の中に含める (デフォルト)",
      "keep: インベントリ内にキープ",
      "give: キープ＋未所持なら自動付与",
    ],
    { defaultValueIndex: currentCompassMode - 1 },
  );

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
        compassIndex,
      ] = response.formValues as [
        boolean,
        boolean,
        boolean,
        boolean,
        boolean,
        number,
      ];

      setSettingEnabled(null, SETTING_KEYS.TREE, treeVal);
      setSettingEnabled(null, SETTING_KEYS.ORE, oreVal);
      setSettingEnabled(null, SETTING_KEYS.TORCH, torchVal);
      setSettingEnabled(null, SETTING_KEYS.GRAVE, graveVal);
      setSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS, graveOthersVal);
      world.gameRules.keepInventory = graveVal;

      let compassMsg = "";
      if (typeof compassIndex === "number") {
        const newCompassMode = (compassIndex + 1) as RecoveryCompassMode;
        if (newCompassMode !== currentCompassMode) {
          setRecoveryCompassMode(newCompassMode);
        }
        compassMsg = `・リカバリーコンパス: §e${getRecoveryCompassModeDescription(newCompassMode)}§f\n`;
      }

      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");

      world.sendMessage(
        `§a============================\n` +
          `§6【ワールド共通設定を更新しました】 (変更者: ${player.name})\n` +
          `§f・木の破壊: ${statusText(treeVal)}\n` +
          `・鉱石の破壊: ${statusText(oreVal)}\n` +
          `・オフハンドたいまつ: ${statusText(torchVal)}\n` +
          `・墓機能: ${statusText(graveVal)}\n` +
          `・他人の墓の回収: ${statusText(graveOthersVal)}\n` +
          compassMsg +
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
 * - /scriptevent addon:menu
 * - /scriptevent addon:ore [on|off]
 * - /scriptevent utility:menu
 */
export function handleSettingsScriptEvent(
  event: ScriptEventCommandMessageAfterEvent,
): void {
  const rawId = (event.id || "").trim().toLowerCase();
  const rawMsg = (event.message || "").trim().toLowerCase();

  let cmd = "";
  let arg = "";

  if (rawId.startsWith("addon:")) {
    cmd = rawId.substring(6).trim();
    arg = rawMsg;
  } else if (rawId === "addon") {
    const parts = rawMsg.split(/\s+/);
    cmd = parts[0] || "";
    arg = parts.slice(1).join(" ").trim();
  } else if (rawId.startsWith("utility:")) {
    cmd = rawId.substring(8).trim();
    arg = rawMsg;
  } else if (rawId === "utility") {
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

    case "tree": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.TREE);

      setSettingEnabled(null, SETTING_KEYS.TREE, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
      }
      world.sendMessage(
        `§6[ワールド設定] 木の破壊 (一括伐採) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "ore": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.ORE);

      setSettingEnabled(null, SETTING_KEYS.ORE, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
      }
      world.sendMessage(
        `§6[ワールド設定] 鉱石の破壊 (一括採掘) を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "torch": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.TORCH);

      setSettingEnabled(null, SETTING_KEYS.TORCH, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
      }
      world.sendMessage(
        `§6[ワールド設定] オフハンドたいまつ を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "grave": {
      if (arg === "lost" || arg === "1" || arg === "all") {
        setRecoveryCompassMode(1);
        world.sendMessage(
          `§6[ワールド設定] リカバリーコンパス設定を §e「${getRecoveryCompassModeDescription(1)}」§6 に変更しました。`,
        );
        break;
      }
      if (arg === "keep" || arg === "2") {
        setRecoveryCompassMode(2);
        world.sendMessage(
          `§6[ワールド設定] リカバリーコンパス設定を §e「${getRecoveryCompassModeDescription(2)}」§6 に変更しました。`,
        );
        break;
      }
      if (arg === "give" || arg === "auto" || arg === "3") {
        setRecoveryCompassMode(3);
        world.sendMessage(
          `§6[ワールド設定] リカバリーコンパス設定を §e「${getRecoveryCompassModeDescription(3)}」§6 に変更しました。`,
        );
        break;
      }

      let next: boolean;
      if (arg === "on" || arg === "true") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.GRAVE);

      world.gameRules.keepInventory = next;
      setSettingEnabled(null, SETTING_KEYS.GRAVE, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
      }
      world.sendMessage(
        `§6[ワールド設定] 墓機能 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "compass": {
      let targetMode: RecoveryCompassMode | null = null;
      if (arg === "lost" || arg === "1" || arg === "all") targetMode = 1;
      else if (arg === "keep" || arg === "2") targetMode = 2;
      else if (arg === "give" || arg === "auto" || arg === "3") targetMode = 3;

      if (targetMode !== null) {
        setRecoveryCompassMode(targetMode);
        world.sendMessage(
          `§6[ワールド設定] リカバリーコンパス設定を §e「${getRecoveryCompassModeDescription(targetMode)}」§6 に変更しました。`,
        );
      } else {
        const currentMode = getRecoveryCompassMode();
        primaryPlayer.sendMessage(
          `§6[設定] 現在のリカバリーコンパス設定: §e${getRecoveryCompassModeDescription(currentMode)}\n` +
            `§7使用方法: /scriptevent addon:grave [lost|keep|give]`,
        );
      }
      break;
    }

    case "grave_others":
    case "graveothers": {
      let next: boolean;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS);

      setSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {}
      }
      world.sendMessage(
        `§6[ワールド設定] 他人の墓の回収 を ${next ? "§a[ON]" : "§c[OFF]"} §6に変更しました。`,
      );
      break;
    }

    case "status": {
      const settings = getPlayerSettings();
      const compassMode = getRecoveryCompassMode();
      const statusText = (val: boolean) => (val ? "§a[ON]§r" : "§c[OFF]§r");
      const statusMsg =
        `§a============================\n` +
        `§6【採掘・墓・たいまつ設定 (ワールド共通)】\n` +
        `§f・木の破壊: ${statusText(settings.tree)}\n` +
        `・鉱石の破壊: ${statusText(settings.ore)}\n` +
        `・オフハンドたいまつ: ${statusText(settings.torch)}\n` +
        `・墓機能: ${statusText(settings.grave)}\n` +
        `・他人の墓の回収: ${statusText(settings.graveOthers)}\n` +
        `・リカバリーコンパス: §e${getRecoveryCompassModeDescription(compassMode)}§r\n` +
        `§7(木の剣の長押し/右クリックで設定画面を開く)\n` +
        `§a============================`;
      world.sendMessage(statusMsg);
      break;
    }

    case "help": {
      const helpMsg =
        `§a============================\n` +
        `§6【採掘・墓・たいまつ コマンド一覧】\n` +
        `§f・/scriptevent addon:menu : 設定画面を開く\n` +
        `・/scriptevent addon:tree : 木の破壊のON/OFF切り替え\n` +
        `・/scriptevent addon:ore : 鉱石の破壊のON/OFF切り替え\n` +
        `・/scriptevent addon:torch : オフハンドたいまつのON/OFF切り替え\n` +
        `・/scriptevent addon:grave : 墓機能のON/OFF切り替え\n` +
        `・/scriptevent addon:grave [lost|keep|give] : リカバリーコンパスの扱い設定\n` +
        `・/scriptevent addon:grave_others : 他人の墓の回収のON/OFF切り替え\n` +
        `・/scriptevent addon:status : 現在の設定状態を確認\n` +
        `§7※ 木の剣 (Wooden Sword) を持って画面長押し/右クリックで設定画面が開きます。\n` +
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
 * 設定用アイテム（木の剣）使用時の設定UI表示ハンドラー
 */
export function handleSettingsItemUse(
  event: ItemUseBeforeEvent,
  cancelCallback: () => void,
): void {
  const player = event.source;
  if (!(player instanceof Player)) return;

  const item = event.itemStack;
  if (!item) return;

  // 設定用アイテム: 木の剣 (長押し / 右クリックで設定画面を開く)
  if (item.typeId === "minecraft:wooden_sword") {
    cancelCallback();
    system.run(() => {
      showSettingsForm(player);
    });
  }
}
