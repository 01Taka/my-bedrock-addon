// src/index.ts
import { world as world8, system as system6 } from "@minecraft/server";

// ../node_modules/@minecraft/math/lib/src/general/clamp.js
function clampNumber(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

// ../node_modules/@minecraft/math/lib/src/vector3/coreHelpers.js
var Vector3Utils = class _Vector3Utils {
  /**
   * equals
   *
   * Check the equality of two vectors
   */
  static equals(v1, v2) {
    return v1.x === v2.x && v1.y === v2.y && v1.z === v2.z;
  }
  /**
   * add
   *
   * Add two vectors to produce a new vector
   */
  static add(v1, v2) {
    return { x: v1.x + (v2.x ?? 0), y: v1.y + (v2.y ?? 0), z: v1.z + (v2.z ?? 0) };
  }
  /**
   * subtract
   *
   * Subtract two vectors to produce a new vector (v1-v2)
   */
  static subtract(v1, v2) {
    return { x: v1.x - (v2.x ?? 0), y: v1.y - (v2.y ?? 0), z: v1.z - (v2.z ?? 0) };
  }
  /** scale
   *
   * Multiple all entries in a vector by a single scalar value producing a new vector
   */
  static scale(v1, scale) {
    return { x: v1.x * scale, y: v1.y * scale, z: v1.z * scale };
  }
  /**
   * dot
   *
   * Calculate the dot product of two vectors
   */
  static dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }
  /**
   * cross
   *
   * Calculate the cross product of two vectors. Returns a new vector.
   */
  static cross(a, b) {
    return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x };
  }
  /**
   * magnitude
   *
   * The magnitude of a vector
   */
  static magnitude(v) {
    return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
  }
  /**
   * distance
   *
   * Calculate the distance between two vectors
   */
  static distance(a, b) {
    return _Vector3Utils.magnitude(_Vector3Utils.subtract(a, b));
  }
  /**
   * normalize
   *
   * Takes a vector 3 and normalizes it to a unit vector
   */
  static normalize(v) {
    const mag = _Vector3Utils.magnitude(v);
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  }
  /**
   * floor
   *
   * Floor the components of a vector to produce a new vector
   */
  static floor(v) {
    return { x: Math.floor(v.x), y: Math.floor(v.y), z: Math.floor(v.z) };
  }
  /**
   * ceil
   *
   * Ceil the components of a vector to produce a new vector
   */
  static ceil(v) {
    return { x: Math.ceil(v.x), y: Math.ceil(v.y), z: Math.ceil(v.z) };
  }
  /**
   * min
   *
   * Min the components of two vectors to produce a new vector
   */
  static min(a, b) {
    return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) };
  }
  /**
   * max
   *
   * Max the components of two vectors to produce a new vector
   */
  static max(a, b) {
    return { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
  }
  /**
   * toString
   *
   * Create a string representation of a vector3
   */
  static toString(v, options) {
    const decimals = options?.decimals ?? 2;
    const str = [v.x.toFixed(decimals), v.y.toFixed(decimals), v.z.toFixed(decimals)];
    return str.join(options?.delimiter ?? ", ");
  }
  /**
   * fromString
   *
   * Gets a Vector3 from the string representation produced by {@link Vector3Utils.toString}. If any numeric value is not a number
   * or the format is invalid, undefined is returned.
   * @param str - The string to parse
   * @param delimiter - The delimiter used to separate the components. Defaults to the same as the default for {@link Vector3Utils.toString}
   */
  static fromString(str, delimiter = ",") {
    const parts = str.split(delimiter);
    if (parts.length !== 3) {
      return void 0;
    }
    const output = parts.map((part) => parseFloat(part));
    if (output.some((part) => isNaN(part))) {
      return void 0;
    }
    return { x: output[0], y: output[1], z: output[2] };
  }
  /**
   * clamp
   *
   * Clamps the components of a vector to limits to produce a new vector
   */
  static clamp(v, limits) {
    return {
      x: clampNumber(v.x, limits?.min?.x ?? Number.MIN_SAFE_INTEGER, limits?.max?.x ?? Number.MAX_SAFE_INTEGER),
      y: clampNumber(v.y, limits?.min?.y ?? Number.MIN_SAFE_INTEGER, limits?.max?.y ?? Number.MAX_SAFE_INTEGER),
      z: clampNumber(v.z, limits?.min?.z ?? Number.MIN_SAFE_INTEGER, limits?.max?.z ?? Number.MAX_SAFE_INTEGER)
    };
  }
  /**
   * lerp
   *
   * Constructs a new vector using linear interpolation on each component from two vectors.
   */
  static lerp(a, b, t) {
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t };
  }
  /**
   * slerp
   *
   * Constructs a new vector using spherical linear interpolation on each component from two vectors.
   */
  static slerp(a, b, t) {
    const theta = Math.acos(_Vector3Utils.dot(a, b));
    const sinTheta = Math.sin(theta);
    const ta = Math.sin((1 - t) * theta) / sinTheta;
    const tb = Math.sin(t * theta) / sinTheta;
    return _Vector3Utils.add(_Vector3Utils.scale(a, ta), _Vector3Utils.scale(b, tb));
  }
  /**
   * multiply
   *
   * Element-wise multiplication of two vectors together.
   * Not to be confused with {@link Vector3Utils.dot} product or {@link Vector3Utils.cross} product
   */
  static multiply(a, b) {
    return { x: a.x * b.x, y: a.y * b.y, z: a.z * b.z };
  }
  /**
   * rotateX
   *
   * Rotates the vector around the x axis counterclockwise (left hand rule)
   * @param a - Angle in radians
   */
  static rotateX(v, a) {
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return { x: v.x, y: v.y * cos - v.z * sin, z: v.z * cos + v.y * sin };
  }
  /**
   * rotateY
   *
   * Rotates the vector around the y axis counterclockwise (left hand rule)
   * @param a - Angle in radians
   */
  static rotateY(v, a) {
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return { x: v.x * cos + v.z * sin, y: v.y, z: v.z * cos - v.x * sin };
  }
  /**
   * rotateZ
   *
   * Rotates the vector around the z axis counterclockwise (left hand rule)
   * @param a - Angle in radians
   */
  static rotateZ(v, a) {
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return { x: v.x * cos - v.y * sin, y: v.y * cos + v.x * sin, z: v.z };
  }
};

// ../node_modules/@minecraft/math/lib/src/general/colorUtils.js
var Colors = {
  Black: { red: 29 / 255, green: 29 / 255, blue: 33 / 255, alpha: 1 },
  Blue: { red: 60 / 255, green: 68 / 255, blue: 170 / 255, alpha: 1 },
  Brown: { red: 131 / 255, green: 84 / 255, blue: 50 / 255, alpha: 1 },
  Cyan: { red: 22 / 255, green: 156 / 255, blue: 156 / 255, alpha: 1 },
  Gray: { red: 71 / 255, green: 79 / 255, blue: 82 / 255, alpha: 1 },
  Green: { red: 94 / 255, green: 124 / 255, blue: 22 / 255, alpha: 1 },
  LightBlue: { red: 58 / 255, green: 179 / 255, blue: 218 / 255, alpha: 1 },
  Lime: { red: 128 / 255, green: 199 / 255, blue: 31 / 255, alpha: 1 },
  Magenta: { red: 199 / 255, green: 78 / 255, blue: 189 / 255, alpha: 1 },
  Orange: { red: 249 / 255, green: 128 / 255, blue: 29 / 255, alpha: 1 },
  Pink: { red: 243 / 255, green: 139 / 255, blue: 170 / 255, alpha: 1 },
  Purple: { red: 137 / 255, green: 50 / 255, blue: 184 / 255, alpha: 1 },
  Red: { red: 176 / 255, green: 46 / 255, blue: 38 / 255, alpha: 1 },
  Silver: { red: 157 / 255, green: 157 / 255, blue: 151 / 255, alpha: 1 },
  White: { red: 240 / 255, green: 240 / 255, blue: 240 / 255, alpha: 1 },
  Yellow: { red: 254 / 255, green: 216 / 255, blue: 61 / 255, alpha: 1 },
  PureWhite: { red: 1, green: 1, blue: 1, alpha: 1 },
  PureBlack: { red: 0, green: 0, blue: 0, alpha: 1 },
  PureRed: { red: 1, green: 0, blue: 0, alpha: 1 },
  PureGreen: { red: 0, green: 1, blue: 0, alpha: 1 },
  PureBlue: { red: 0, green: 0, blue: 1, alpha: 1 },
  Transparent: { red: 0, green: 0, blue: 0, alpha: 0 }
};

// ../node_modules/@minecraft/math/lib/src/aabb/coreHelpers.js
import { BlockVolume } from "@minecraft/server";

// src/mass-destruction.ts
import {
  EquipmentSlot as EquipmentSlot2,
  GameMode
} from "@minecraft/server";

// src/utils.ts
import {
  EquipmentSlot,
  ItemComponentTypes
} from "@minecraft/server";
function getMainHandItemInfo(player) {
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return null;
  const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
  if (!mainhandItem) return null;
  const durability = mainhandItem.getComponent("minecraft:durability");
  const unbreaking = getEnchantmentLevel(mainhandItem, "unbreaking");
  const fortune = getEnchantmentLevel(mainhandItem, "fortune");
  const silkTouch = getEnchantmentLevel(mainhandItem, "silk_touch");
  return {
    equippable,
    mainhandItem,
    durability,
    enchant: {
      unbreaking,
      fortune,
      silkTouch
    }
  };
}
function getEnchantmentLevel(item, enchantment) {
  if (!item) return 0;
  const enchantable = item.getComponent(ItemComponentTypes.Enchantable);
  if (!enchantable) return 0;
  const result = enchantable.getEnchantment(enchantment);
  if (result) {
    return result.level;
  }
  return 0;
}

// src/settings.ts
import {
  world,
  Player as Player2,
  system
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";
var SETTING_KEYS = {
  TREE: "setting_tree",
  ORE: "setting_ore",
  TORCH: "setting_torch",
  GRAVE: "setting_grave",
  GRAVE_OTHERS: "setting_grave_others"
};
var memorySettingsFallback = /* @__PURE__ */ new Map();
function getPlayerMemoryMap(player) {
  const key = player.id || player.name || "default";
  let map = memorySettingsFallback.get(key);
  if (!map) {
    map = /* @__PURE__ */ new Map();
    memorySettingsFallback.set(key, map);
  }
  return map;
}
function isSettingEnabled(player, key, defaultValue = true) {
  try {
    const val = player.getDynamicProperty(key);
    if (typeof val === "boolean") {
      return val;
    }
  } catch (e) {
  }
  const memMap = getPlayerMemoryMap(player);
  if (memMap.has(key)) {
    return memMap.get(key);
  }
  return defaultValue;
}
function setSettingEnabled(player, key, enabled) {
  try {
    player.setDynamicProperty(key, enabled);
  } catch (e) {
    console.error(`\u8A2D\u5B9A\u4FDD\u5B58\u30A8\u30E9\u30FC [${key}]:`, e);
  }
  getPlayerMemoryMap(player).set(key, enabled);
}
function getPlayerSettings(player) {
  return {
    tree: isSettingEnabled(player, SETTING_KEYS.TREE),
    ore: isSettingEnabled(player, SETTING_KEYS.ORE),
    torch: isSettingEnabled(player, SETTING_KEYS.TORCH),
    grave: isSettingEnabled(player, SETTING_KEYS.GRAVE),
    graveOthers: isSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS)
  };
}
function showSettingsForm(player) {
  const current = getPlayerSettings(player);
  const form = new ModalFormData();
  form.title("\xA7l\xA76\u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064\u8A2D\u5B9A");
  form.toggle("\u6728\u306E\u7834\u58CA (\u4E00\u62EC\u4F10\u63A1)", { defaultValue: current.tree });
  form.toggle("\u9271\u77F3\u306E\u7834\u58CA (\u4E00\u62EC\u63A1\u6398)", { defaultValue: current.ore });
  form.toggle("\u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064 (\u52D5\u7684\u5149\u6E90\u30FB\u6301\u3061\u66FF\u3048)", {
    defaultValue: current.torch
  });
  form.toggle("\u5893\u6A5F\u80FD (\u6B7B\u4EA1\u6642\u30A2\u30A4\u30C6\u30E0\u4FDD\u8B77)", { defaultValue: current.grave });
  form.toggle("\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE (\u4ED6\u4EBA\u306E\u5893\u77F3\u3092\u958B\u3051\u308B)", {
    defaultValue: current.graveOthers
  });
  form.show(player).then((response) => {
    if (response.canceled || !response.formValues) return;
    const [
      treeVal,
      oreVal,
      torchVal,
      graveVal,
      graveOthersVal
    ] = response.formValues;
    setSettingEnabled(player, SETTING_KEYS.TREE, treeVal);
    setSettingEnabled(player, SETTING_KEYS.ORE, oreVal);
    setSettingEnabled(player, SETTING_KEYS.TORCH, torchVal);
    setSettingEnabled(player, SETTING_KEYS.GRAVE, graveVal);
    setSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS, graveOthersVal);
    world.gameRules.keepInventory = graveVal;
    const statusText = (val) => val ? "\xA7a[ON]\xA7r" : "\xA7c[OFF]\xA7r";
    player.sendMessage(
      `\xA7a============================
\xA76\u3010\u30A2\u30C9\u30AA\u30F3\u8A2D\u5B9A\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3011
\xA7f\u30FB\u6728\u306E\u7834\u58CA: ${statusText(treeVal)}
\u30FB\u9271\u77F3\u306E\u7834\u58CA: ${statusText(oreVal)}
\u30FB\u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064: ${statusText(torchVal)}
\u30FB\u5893\u6A5F\u80FD: ${statusText(graveVal)}
\u30FB\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE: ${statusText(graveOthersVal)}
\xA7a============================`
    );
  }).catch((error) => {
    console.error("\u8A2D\u5B9AUI\u8868\u793A\u30A8\u30E9\u30FC:", error);
  });
}
function handleSettingsScriptEvent(event) {
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
  const allOnlinePlayers = world.getAllPlayers();
  let targets = [];
  if (event.sourceEntity && (event.sourceEntity instanceof Player2 || event.sourceEntity.typeId === "minecraft:player")) {
    targets = [event.sourceEntity];
  } else if (arg) {
    const targetName = arg.split(/\s+/)[0];
    const found = allOnlinePlayers.find(
      (p) => p.name.toLowerCase() === targetName.toLowerCase()
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
  const isServerSource = !(event.sourceEntity instanceof Player2);
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
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.TREE);
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.TREE, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
        p.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u6728\u306E\u7834\u58CA (\u4E00\u62EC\u4F10\u63A1) \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u6728\u306E\u7834\u58CA (\u4E00\u62EC\u4F10\u63A1) \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      break;
    }
    case "ore": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.ORE);
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.ORE, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
        p.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u9271\u77F3\u306E\u7834\u58CA (\u4E00\u62EC\u63A1\u6398) \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u9271\u77F3\u306E\u7834\u58CA (\u4E00\u62EC\u63A1\u6398) \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      break;
    }
    case "torch": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.TORCH);
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.TORCH, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
        p.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064 \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064 \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      break;
    }
    case "grave": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.GRAVE);
      world.gameRules.keepInventory = next;
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.GRAVE, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
        p.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u5893\u6A5F\u80FD \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u5893\u6A5F\u80FD \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      break;
    }
    case "grave_others":
    case "graveothers": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(primaryPlayer, SETTING_KEYS.GRAVE_OTHERS);
      for (const p of targets) {
        setSettingEnabled(p, SETTING_KEYS.GRAVE_OTHERS, next);
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
        p.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      if (isServerSource) {
        world.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      }
      break;
    }
    case "status": {
      const settings = getPlayerSettings(primaryPlayer);
      const statusText = (val) => val ? "\xA7a[ON]\xA7r" : "\xA7c[OFF]\xA7r";
      const statusMsg = `\xA7a============================
\xA76\u3010\u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064\u8A2D\u5B9A\u3011
\xA7f\u30FB\u6728\u306E\u7834\u58CA: ${statusText(settings.tree)}
\u30FB\u9271\u77F3\u306E\u7834\u58CA: ${statusText(settings.ore)}
\u30FB\u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064: ${statusText(settings.torch)}
\u30FB\u5893\u6A5F\u80FD: ${statusText(settings.grave)}
\u30FB\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE: ${statusText(settings.graveOthers)}
\xA77(/scriptevent addon:menu \u3067\u8A2D\u5B9A\u753B\u9762\u3092\u958B\u304F)
\xA7a============================`;
      for (const p of targets) {
        p.sendMessage(statusMsg);
      }
      if (isServerSource) {
        world.sendMessage(statusMsg);
      }
      break;
    }
    case "help": {
      const helpMsg = `\xA7a============================
\xA76\u3010\u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064 \u30B3\u30DE\u30F3\u30C9\u4E00\u89A7\u3011
\xA7f\u30FB/scriptevent addon:menu : \u8A2D\u5B9A\u753B\u9762\u3092\u958B\u304F
\u30FB/scriptevent addon:tree : \u6728\u306E\u7834\u58CA\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent addon:ore : \u9271\u77F3\u306E\u7834\u58CA\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent addon:torch : \u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent addon:grave : \u5893\u6A5F\u80FD\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent addon:grave_others : \u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent addon:status : \u73FE\u5728\u306E\u8A2D\u5B9A\u72B6\u614B\u3092\u78BA\u8A8D
\xA77\u203B \u6642\u8A08(Clock)\u3092\u6301\u3063\u3066\u753B\u9762\u9577\u62BC\u3057/\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u3082\u8A2D\u5B9A\u753B\u9762\u304C\u958B\u304D\u307E\u3059\u3002
\xA7a============================`;
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
function handleSettingsItemUse(event, cancelCallback) {
  const player = event.source;
  if (!(player instanceof Player2)) return;
  const item = event.itemStack;
  if (!item) return;
  const isClock = item.typeId === "minecraft:clock";
  const isSneakTool = player.isSneaking && (item.typeId === "minecraft:stick" || item.typeId === "minecraft:feather" || item.typeId === "minecraft:paper");
  if (isClock || isSneakTool) {
    cancelCallback();
    system.run(() => {
      showSettingsForm(player);
    });
  }
}

// src/mass-destruction.ts
var config = {
  maxLog: 150,
  // 原木の破壊上限
  maxLeaves: 1e3,
  // 葉っぱの破壊上限
  leafRadius: 4
  // 葉っぱの破壊半径
};
var LOG_TO_LEAVES = {
  "minecraft:oak_log": "minecraft:oak_leaves",
  "minecraft:spruce_log": "minecraft:spruce_leaves",
  "minecraft:birch_log": "minecraft:birch_leaves",
  "minecraft:jungle_log": "minecraft:jungle_leaves",
  "minecraft:acacia_log": "minecraft:acacia_leaves",
  "minecraft:dark_oak_log": "minecraft:dark_oak_leaves",
  "minecraft:mangrove_log": "minecraft:mangrove_leaves",
  "minecraft:cherry_log": "minecraft:cherry_leaves",
  "minecraft:pale_oak_log": "minecraft:pale_oak_leaves",
  "minecraft:crimson_stem": "minecraft:nether_wart_block",
  "minecraft:warped_stem": "minecraft:warped_wart_block"
};
var ORE_BLOCK_IDS = /* @__PURE__ */ new Set([
  // --- オーバーワールド（石系） ---
  "minecraft:coal_ore",
  "minecraft:copper_ore",
  "minecraft:iron_ore",
  "minecraft:lapis_ore",
  "minecraft:gold_ore",
  "minecraft:redstone_ore",
  "minecraft:lit_redstone_ore",
  // 点灯状態
  "minecraft:diamond_ore",
  "minecraft:emerald_ore",
  // --- オーバーワールド（深層岩系） ---
  "minecraft:deepslate_coal_ore",
  "minecraft:deepslate_copper_ore",
  "minecraft:deepslate_iron_ore",
  "minecraft:deepslate_lapis_ore",
  "minecraft:deepslate_gold_ore",
  "minecraft:deepslate_redstone_ore",
  "minecraft:lit_deepslate_redstone_ore",
  // 点灯状態
  "minecraft:deepslate_diamond_ore",
  "minecraft:deepslate_emerald_ore",
  // --- ネザー ---
  "minecraft:nether_gold_ore",
  "minecraft:quartz_ore",
  "minecraft:gilded_blackstone",
  "minecraft:ancient_debris",
  // --- 関連ブロック（生鉱石・アメジスト） ---
  "minecraft:amethyst_cluster",
  "minecraft:raw_iron_block",
  "minecraft:raw_copper_block",
  "minecraft:raw_gold_block"
]);
function expandZone(zone, position, radius) {
  if (!zone) {
    return {
      min: {
        x: position.x - radius,
        y: position.y - radius,
        z: position.z - radius
      },
      max: {
        x: position.x + radius,
        y: position.y + radius,
        z: position.z + radius
      }
    };
  }
  return {
    min: {
      x: Math.min(zone.min.x, position.x - radius),
      y: Math.min(zone.min.y, position.y - radius),
      z: Math.min(zone.min.z, position.z - radius)
    },
    max: {
      x: Math.max(zone.max.x, position.x + radius),
      y: Math.max(zone.max.y, position.y + radius),
      z: Math.max(zone.max.z, position.z + radius)
    }
  };
}
function isInZone(zone, position, isInfY) {
  return zone.min.x <= position.x && (zone.min.y <= position.y || isInfY) && zone.min.z <= position.z && zone.max.x >= position.x && (zone.max.y >= position.y || isInfY) && zone.max.z >= position.z;
}
function getAroundPositions(position) {
  const result = [];
  const shift = [-1, 0, 1];
  for (const x of shift) {
    for (const y of shift) {
      for (const z of shift) {
        if (x === 0 && y === 0 && z === 0) continue;
        result.push(Vector3Utils.add(position, { x, y, z }));
      }
    }
  }
  return result;
}
function vector3ToString(vector) {
  return `${vector.x}_${vector.y}_${vector.z}`;
}
function getConnectedPositions(dimension, startPositions, predicate, options) {
  const maxCount = options?.maxCount ?? 1e3;
  const searchedSet = options?.searchedSet ?? /* @__PURE__ */ new Set();
  const nextQueue = startPositions.map(
    (pos) => Vector3Utils.floor(pos)
  );
  nextQueue.forEach((pos) => searchedSet.add(vector3ToString(pos)));
  const matchedPositions = [];
  while (nextQueue.length > 0 && matchedPositions.length < maxCount) {
    const currentTargets = [...nextQueue];
    nextQueue.length = 0;
    for (const targetPos of currentTargets) {
      const block = dimension.getBlock(targetPos);
      if (!block) continue;
      if (predicate(block)) {
        matchedPositions.push(targetPos);
        if (matchedPositions.length >= maxCount) break;
        for (const aroundPos of getAroundPositions(targetPos)) {
          const key = vector3ToString(aroundPos);
          if (!searchedSet.has(key)) {
            searchedSet.add(key);
            nextQueue.push(aroundPos);
          }
        }
      }
    }
  }
  return {
    connectedPositions: matchedPositions,
    searchedSet
  };
}
function calculateDurabilityDamage(unbreakingLevel, baseDamage = 1) {
  if (unbreakingLevel <= 0) {
    return Math.round(baseDamage);
  }
  const expectedDamage = baseDamage / (unbreakingLevel + 1);
  return Math.round(expectedDamage);
}
function destroyBlock(dimension, position, player) {
  try {
    if (player && player.isValid) {
      player.runCommand(
        `loot spawn ${position.x} ${position.y} ${position.z} mine ${position.x} ${position.y} ${position.z} mainhand`
      );
      dimension.runCommand(
        `setblock ${position.x} ${position.y} ${position.z} air`
      );
    } else {
      dimension.runCommand(
        `setblock ${position.x} ${position.y} ${position.z} air destroy`
      );
    }
  } catch (e) {
  }
}
function oreMassDestruction(event, breakableBlockIdSet) {
  const player = event.player;
  if (!isSettingEnabled(player, SETTING_KEYS.ORE)) return;
  const blockId = event.brokenBlockPermutation.type.id;
  if (!breakableBlockIdSet.has(blockId)) return;
  if (player.isSneaking) return;
  const info = getMainHandItemInfo(player);
  if (!info) return;
  const { equippable, mainhandItem, durability, enchant } = info;
  if (!durability || !mainhandItem.typeId.endsWith("_pickaxe")) return;
  const remainingDurability = durability.maxDurability - durability.damage;
  if (remainingDurability <= 1) return;
  const { connectedPositions: destroyPositions } = getConnectedPositions(
    player.dimension,
    getAroundPositions(event.block.location),
    (block) => {
      return blockId === block.typeId;
    },
    { maxCount: 100 }
  );
  for (const position of destroyPositions) {
    destroyBlock(event.dimension, position, player);
  }
  if (player.getGameMode() !== GameMode.Creative) {
    durability.damage = Math.min(
      durability.maxDurability,
      calculateDurabilityDamage(
        enchant.unbreaking,
        durability.damage + destroyPositions.length
      )
    );
    equippable.setEquipment(EquipmentSlot2.Mainhand, mainhandItem);
  }
}
function treeMassDestruction(event) {
  const player = event.player;
  if (!isSettingEnabled(player, SETTING_KEYS.TREE)) return;
  const blockId = event.brokenBlockPermutation.type.id;
  if (!(blockId in LOG_TO_LEAVES)) return;
  if (player.isSneaking) return;
  const info = getMainHandItemInfo(player);
  if (!info) return;
  const { equippable, mainhandItem, durability, enchant } = info;
  if (!durability || !mainhandItem.typeId.endsWith("_axe")) return;
  const remainingDurability = durability.maxDurability - durability.damage;
  if (remainingDurability <= 1) return;
  let zone = null;
  const leafId = LOG_TO_LEAVES[blockId];
  const aroundLeafList = [];
  const { connectedPositions: treeDestroyPositions, searchedSet } = getConnectedPositions(
    player.dimension,
    getAroundPositions(event.block.location),
    (block) => {
      if (block.typeId === leafId) {
        aroundLeafList.push(block.location);
      }
      if (block.typeId === blockId) {
        zone = expandZone(zone, block.location, config.leafRadius);
        return true;
      }
      return false;
    },
    { maxCount: config.maxLog }
  );
  const connectedTreeSet = new Set(
    treeDestroyPositions.map((pos) => vector3ToString(pos))
  );
  const connectedOtherTreeAround = /* @__PURE__ */ new Set();
  let somePersistent = false;
  const { connectedPositions: leafDestroyPositions } = getConnectedPositions(
    player.dimension,
    aroundLeafList,
    (block) => {
      if (block.typeId === blockId && !connectedTreeSet.has(vector3ToString(block.location))) {
        connectedOtherTreeAround.add(vector3ToString(block.location));
        getAroundPositions(block.location).forEach((pos) => {
          connectedOtherTreeAround.add(vector3ToString(pos));
        });
      }
      const inZone = zone ? isInZone(zone, block.location, true) : true;
      if (block.typeId === leafId && inZone) {
        const isPersistent = block.permutation.getState("persistent_bit");
        if (isPersistent === false) {
          somePersistent = true;
        }
        return true;
      }
      return false;
    },
    {
      maxCount: config.maxLeaves,
      searchedSet
    }
  );
  if (!somePersistent) return;
  const destroyPositions = [
    ...treeDestroyPositions,
    ...leafDestroyPositions.filter(
      (pos) => !connectedOtherTreeAround.has(vector3ToString(pos))
    )
  ];
  for (const position of destroyPositions) {
    destroyBlock(event.dimension, position, player);
  }
  if (player.getGameMode() !== GameMode.Creative) {
    durability.damage = Math.min(
      durability.maxDurability,
      calculateDurabilityDamage(
        enchant.unbreaking,
        durability.damage + treeDestroyPositions.length
      )
    );
    equippable.setEquipment(EquipmentSlot2.Mainhand, mainhandItem);
  }
}

// src/offhand-touch.ts
import {
  world as world2,
  system as system2,
  EquipmentSlot as EquipmentSlot3,
  Player as Player4,
  BlockPermutation,
  Direction
} from "@minecraft/server";
var TORCH_LIGHT_LEVELS = {
  "minecraft:torch": 14,
  // 通常のたいまつ
  "minecraft:soul_torch": 10,
  // 魂のたいまつ
  "minecraft:copper_torch": 14,
  // 銅のたいまつ
  "minecraft:redstone_torch": 7
  // レッドストーンたいまつ
};
var activeLights = /* @__PURE__ */ new Map();
function isLightBlock(typeId) {
  return typeId === "minecraft:light_block" || typeId.startsWith("minecraft:light_block_");
}
function isAirOrLightBlock(typeId) {
  return typeId === "minecraft:air" || isLightBlock(typeId);
}
function getOffhandTorchLightLevel(player) {
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return null;
  const offhandItem = equippable.getEquipment(EquipmentSlot3.Offhand);
  if (!offhandItem) return null;
  const level = TORCH_LIGHT_LEVELS[offhandItem.typeId];
  if (level === void 0) return null;
  return { typeId: offhandItem.typeId, level };
}
function removeLight(dimension, position) {
  try {
    const block = dimension.getBlock(position);
    if (block && isLightBlock(block.typeId)) {
      block.setType("minecraft:air");
    }
  } catch (e) {
  }
}
function placeLight(dimension, position, level) {
  try {
    const block = dimension.getBlock(position);
    if (!block || !isAirOrLightBlock(block.typeId)) return false;
    const lightPermutation = BlockPermutation.resolve("minecraft:light_block", {
      block_light_level: level
    });
    block.setPermutation(lightPermutation);
    return true;
  } catch (e) {
    return false;
  }
}
function clearPreviousLight(playerId) {
  const previous = activeLights.get(playerId);
  if (!previous) return;
  try {
    const dimension = world2.getDimension(previous.dimensionId);
    for (const position of previous.locations) {
      removeLight(dimension, position);
    }
  } catch (e) {
  }
  activeLights.delete(playerId);
}
function findSuitableLightPosition(player) {
  const footPos = Vector3Utils.floor(player.location);
  const headPos = { x: footPos.x, y: footPos.y + 1, z: footPos.z };
  const dimension = player.dimension;
  const footBlock = dimension.getBlock(footPos);
  if (footBlock && isAirOrLightBlock(footBlock.typeId)) {
    return { pos: footPos, type: "\u8DB3\u5143" };
  }
  const headBlock = dimension.getBlock(headPos);
  if (headBlock && isAirOrLightBlock(headBlock.typeId)) {
    return { pos: headPos, type: "\u982D" };
  }
  return null;
}
var faceOffsets = {
  [Direction.Up]: { x: 0, y: 1, z: 0 },
  [Direction.Down]: { x: 0, y: -1, z: 0 },
  [Direction.North]: { x: 0, y: 0, z: -1 },
  [Direction.South]: { x: 0, y: 0, z: 1 },
  [Direction.East]: { x: 1, y: 0, z: 0 },
  [Direction.West]: { x: -1, y: 0, z: 0 }
};
function getLookAtBlock(player, maxDistance = 10) {
  const dimension = player.dimension;
  const hit = player.getBlockFromViewDirection({
    maxDistance,
    includeLiquidBlocks: true,
    includePassableBlocks: true
  });
  if (hit) {
    const offset = faceOffsets[hit.face];
    const adjacentLocation = Vector3Utils.add(hit.block.location, offset);
    return dimension.getBlock(adjacentLocation);
  } else {
    const headLocation = player.getHeadLocation();
    const viewDirection = player.getViewDirection();
    const targetLocation = Vector3Utils.add(
      headLocation,
      Vector3Utils.scale(viewDirection, maxDistance)
    );
    return dimension.getBlock(targetLocation);
  }
}
system2.runInterval(() => {
  for (const player of world2.getAllPlayers()) {
    const playerId = player.id;
    if (!player.isValid || !playerId) {
      clearPreviousLight(playerId);
      continue;
    }
    if (!isSettingEnabled(player, SETTING_KEYS.TORCH)) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }
    const torchInfo = getOffhandTorchLightLevel(player);
    if (!torchInfo) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }
    const prev = activeLights.get(playerId);
    const dimension = player.dimension;
    if (prev && (prev.level !== torchInfo.level || prev.dimensionId !== dimension.id)) {
      clearPreviousLight(playerId);
    }
    const newTargetLocations = [];
    const suitablePos = findSuitableLightPosition(player);
    if (suitablePos) {
      newTargetLocations.push(suitablePos.pos);
    }
    if (player.isSneaking) {
      const lookAtDistances = [5, 10];
      for (const dist of lookAtDistances) {
        const block = getLookAtBlock(player, dist);
        if (block && isAirOrLightBlock(block.typeId)) {
          if (!newTargetLocations.some(
            (pos) => Vector3Utils.equals(pos, block.location)
          )) {
            newTargetLocations.push(block.location);
          }
        }
      }
    }
    if (newTargetLocations.length === 0) {
      if (activeLights.has(playerId)) {
        clearPreviousLight(playerId);
      }
      continue;
    }
    const currentPrev = activeLights.get(playerId);
    const prevLocations = currentPrev ? currentPrev.locations : [];
    for (const prevPos of prevLocations) {
      const isStillNeeded = newTargetLocations.some(
        (newPos) => Vector3Utils.equals(newPos, prevPos)
      );
      if (!isStillNeeded) {
        removeLight(dimension, prevPos);
      }
    }
    const finalizedLocations = [];
    for (const targetPos of newTargetLocations) {
      const alreadyPlaced = prevLocations.some(
        (prevPos) => Vector3Utils.equals(prevPos, targetPos)
      );
      if (alreadyPlaced) {
        finalizedLocations.push(targetPos);
      } else {
        const success = placeLight(dimension, targetPos, torchInfo.level);
        if (success) {
          finalizedLocations.push(targetPos);
        }
      }
    }
    activeLights.set(playerId, {
      dimensionId: dimension.id,
      level: torchInfo.level,
      locations: finalizedLocations
    });
  }
}, 2);
world2.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity instanceof Player4) {
    clearPreviousLight(event.deadEntity.id);
  }
});
world2.afterEvents.playerDimensionChange.subscribe((event) => {
  clearPreviousLight(event.player.id);
});
world2.afterEvents.playerLeave.subscribe((event) => {
  clearPreviousLight(event.playerId);
});
function handleTorchSwap(player, cancelCallback) {
  if (!isSettingEnabled(player, SETTING_KEYS.TORCH)) return;
  if (!player.isSneaking) return;
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  const mainhandItem = equippable.getEquipment(EquipmentSlot3.Mainhand);
  const offhandItem = equippable.getEquipment(EquipmentSlot3.Offhand);
  if (mainhandItem && mainhandItem.typeId in TORCH_LIGHT_LEVELS && !offhandItem) {
    cancelCallback();
    system2.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.offhand 0 ${mainhandItem.typeId} ${mainhandItem.amount}`
      );
      equippable.setEquipment(EquipmentSlot3.Mainhand, void 0);
    });
    return;
  }
  if (!mainhandItem && offhandItem && offhandItem.typeId in TORCH_LIGHT_LEVELS) {
    cancelCallback();
    system2.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.mainhand 0 ${offhandItem.typeId} ${offhandItem.amount}`
      );
      player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
    });
    return;
  }
}

// src/grave.ts
import {
  world as world3,
  system as system3,
  EquipmentSlot as EquipmentSlot4,
  EntityComponentTypes,
  BlockComponentTypes,
  ItemStack as ItemStack3,
  Player as Player5
} from "@minecraft/server";
var GRAVE_PAPER_PREFIX = "\xA7e\u5893\u306E\u5EA7\u6A19";
function generateGraveId(playerId, dimensionId, x, y, z) {
  return `grave_${playerId}_${dimensionId}_${x}_${y}_${z}`;
}
function getDimensionName(id) {
  switch (id) {
    case "minecraft:overworld":
      return "\u30AA\u30FC\u30D0\u30FC\u30EF\u30FC\u30EB\u30C9";
    case "minecraft:nether":
      return "\u30CD\u30B6\u30FC";
    case "minecraft:the_end":
      return "\u30B8\u30FB\u30A8\u30F3\u30C9";
    default:
      return id;
  }
}
function handleGraveEntityDie(event) {
  const deadEntity = event.deadEntity;
  if (!(deadEntity instanceof Player5)) return;
  const player = deadEntity;
  if (!isSettingEnabled(player, SETTING_KEYS.GRAVE)) {
    return;
  }
  const dimension = player.dimension;
  const playerName = player.nameTag || player.id || "Player";
  const playerId = player.id;
  const basePos = {
    x: Math.floor(player.location.x),
    y: Math.max(Math.floor(player.location.y), dimension.heightRange.min),
    z: Math.floor(player.location.z)
  };
  const items = [];
  const invComp = player.getComponent(EntityComponentTypes.Inventory);
  const inv = invComp?.container;
  if (inv) {
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) {
        const isGravePaper = item.typeId === "minecraft:paper" && (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) || item.getDynamicProperty("grave_id") !== void 0);
        if (!isGravePaper) {
          items.push(item.clone());
        }
      }
    }
  }
  const equippable = player.getComponent(EntityComponentTypes.Equippable);
  const slots = [
    EquipmentSlot4.Head,
    EquipmentSlot4.Chest,
    EquipmentSlot4.Legs,
    EquipmentSlot4.Feet,
    EquipmentSlot4.Offhand
  ];
  if (equippable) {
    for (const slot of slots) {
      const item = equippable.getEquipment(slot);
      if (item) {
        const isGravePaper = item.typeId === "minecraft:paper" && (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) || item.getDynamicProperty("grave_id") !== void 0);
        if (!isGravePaper) {
          items.push(item.clone());
        }
      }
    }
  }
  if (items.length === 0) return;
  system3.run(() => {
    try {
      let targetMinY = dimension.heightRange.min + 1;
      while (targetMinY < dimension.heightRange.min + 20) {
        const b1 = dimension.getBlock({
          x: basePos.x,
          y: targetMinY,
          z: basePos.z
        });
        if (b1 && b1.typeId !== "minecraft:chest") {
          break;
        }
        targetMinY++;
      }
      const hidePos1 = { x: basePos.x, y: targetMinY, z: basePos.z };
      const hidePos2 = {
        x: basePos.x + 1,
        y: targetMinY,
        z: basePos.z
      };
      const hideBlock1 = dimension.getBlock(hidePos1);
      const hideBlock2 = dimension.getBlock(hidePos2);
      if (!hideBlock1 || !hideBlock2) return;
      const origType1 = hideBlock1.typeId;
      const origType2 = hideBlock2.typeId;
      hideBlock1.setType("minecraft:chest");
      hideBlock2.setType("minecraft:chest");
      const c1Comp = hideBlock1.getComponent(BlockComponentTypes.Inventory);
      const c2Comp = hideBlock2.getComponent(BlockComponentTypes.Inventory);
      const c1 = c1Comp?.container;
      const c2 = c2Comp?.container;
      let itemIdx = 0;
      if (c1) {
        for (let i = 0; i < c1.size && itemIdx < items.length; i++) {
          c1.setItem(i, items[itemIdx++]);
        }
      }
      if (c2 && itemIdx < items.length) {
        for (let i = 0; i < c2.size && itemIdx < items.length; i++) {
          c2.setItem(i, items[itemIdx++]);
        }
      }
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item) {
            const isGravePaper = item.typeId === "minecraft:paper" && (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) || item.getDynamicProperty("grave_id") !== void 0);
            if (!isGravePaper) {
              inv.setItem(i, void 0);
            }
          }
        }
      }
      if (equippable) {
        for (const slot of slots) {
          const item = equippable.getEquipment(slot);
          if (item) {
            const isGravePaper = item.typeId === "minecraft:paper" && (item.nameTag?.startsWith(GRAVE_PAPER_PREFIX) || item.getDynamicProperty("grave_id") !== void 0);
            if (!isGravePaper) {
              equippable.setEquipment(slot, void 0);
            }
          }
        }
      }
      let targetGraveBlock = dimension.getBlock(basePos);
      let origGroundType = "minecraft:air";
      const groundBlock0 = dimension.getBlock(basePos);
      const groundBlock1 = dimension.getBlock({
        x: basePos.x,
        y: Math.min(basePos.y + 1, dimension.heightRange.max),
        z: basePos.z
      });
      if (groundBlock0 && groundBlock0.isAir) {
        targetGraveBlock = groundBlock0;
        origGroundType = "minecraft:air";
      } else if (groundBlock1 && groundBlock1.isAir) {
        targetGraveBlock = groundBlock1;
        origGroundType = "minecraft:air";
      } else if (groundBlock0) {
        targetGraveBlock = groundBlock0;
        origGroundType = groundBlock0.typeId;
      }
      if (targetGraveBlock) {
        const finalPos = targetGraveBlock.location;
        targetGraveBlock.setType("minecraft:bedrock");
        const graveId = generateGraveId(
          playerId,
          dimension.id,
          finalPos.x,
          finalPos.y,
          finalPos.z
        );
        const graveKey = `grave_${finalPos.x}_${finalPos.y}_${finalPos.z}`;
        const graveData = {
          graveId,
          ownerId: playerId,
          ownerName: playerName,
          dimensionId: dimension.id,
          allowOthers: isSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS),
          hideX: hidePos1.x,
          hideY: targetMinY,
          hideZ: hidePos1.z,
          origType1,
          origType2,
          origGroundType
        };
        world3.setDynamicProperty(graveKey, JSON.stringify(graveData));
        const locationInfo = {
          x: finalPos.x,
          y: finalPos.y,
          z: finalPos.z,
          dimensionId: dimension.id,
          graveId
        };
        player.setDynamicProperty(
          "latest_grave_pos",
          JSON.stringify(locationInfo)
        );
        world3.sendMessage(
          `\xA7c${playerName} \u306E\u5893\u304C\u751F\u6210\u3055\u308C\u307E\u3057\u305F [X: ${finalPos.x}, Y: ${finalPos.y}, Z: ${finalPos.z}]`
        );
      }
    } catch (e) {
      console.error("\u5893\u751F\u6210\u30A8\u30E9\u30FC: " + e);
    }
  });
}
function handleGravePlayerSpawn(event) {
  if (event.initialSpawn) return;
  const player = event.player;
  const rawData = player.getDynamicProperty("latest_grave_pos");
  if (typeof rawData !== "string") return;
  const info = JSON.parse(rawData);
  const graveId = info.graveId || generateGraveId(player.id, info.dimensionId, info.x, info.y, info.z);
  system3.run(() => {
    const invComp = player.getComponent(EntityComponentTypes.Inventory);
    const inv = invComp?.container;
    if (inv) {
      const paper = new ItemStack3("minecraft:paper", 1);
      paper.nameTag = `${GRAVE_PAPER_PREFIX} [X: ${info.x}, Y: ${info.y}, Z: ${info.z}]`;
      paper.setDynamicProperty("grave_id", graveId);
      paper.setLore([
        `\xA77\u4E16\u754C: ${getDimensionName(info.dimensionId)}`,
        `\xA77X: ${info.x}, Y: ${info.y}, Z: ${info.z}`,
        `\xA7a\u5CA9\u76E4\u3092\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u30A2\u30A4\u30C6\u30E0\u3092\u56DE\u53CE`
      ]);
      inv.addItem(paper);
    }
    player.setDynamicProperty("latest_grave_pos", void 0);
  });
}
function handleGraveBeforeInteract(event) {
  const block = event.block;
  const player = event.player;
  const dimension = block.dimension;
  const graveKey = `grave_${block.location.x}_${block.location.y}_${block.location.z}`;
  const rawData = world3.getDynamicProperty(graveKey);
  if (typeof rawData !== "string") return;
  event.cancel = true;
  const data = JSON.parse(rawData);
  if (data.ownerId !== player.id) {
    const ownerAllows = data.allowOthers !== false;
    const playerAllows = isSettingEnabled(player, SETTING_KEYS.GRAVE_OTHERS);
    if (!ownerAllows || !playerAllows) {
      player.sendMessage(
        `\xA7c\u3053\u308C\u306F ${data.ownerName} \u306E\u5893\u3067\u3059\uFF01\uFF08\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE\u306F\u7121\u52B9\u5316\u3055\u308C\u3066\u3044\u307E\u3059\uFF09`
      );
      return;
    }
  }
  system3.run(() => {
    try {
      const hideBlock1 = dimension.getBlock({
        x: data.hideX,
        y: data.hideY,
        z: data.hideZ
      });
      const hideBlock2 = dimension.getBlock({
        x: data.hideX + 1,
        y: data.hideY,
        z: data.hideZ
      });
      for (const hideBlock of [hideBlock1, hideBlock2]) {
        if (hideBlock) {
          const comp = hideBlock.getComponent(BlockComponentTypes.Inventory);
          const container = comp?.container;
          if (container) {
            for (let i = 0; i < container.size; i++) {
              const item = container.getItem(i);
              if (item) {
                dimension.spawnItem(item, {
                  x: block.location.x + 0.5,
                  y: block.location.y + 1,
                  z: block.location.z + 0.5
                });
                container.setItem(i, void 0);
              }
            }
          }
        }
      }
      if (hideBlock1) hideBlock1.setType(data.origType1);
      if (hideBlock2) hideBlock2.setType(data.origType2);
      block.setType(data.origGroundType || "minecraft:air");
      world3.setDynamicProperty(graveKey, void 0);
      const targetGraveId = data.graveId || generateGraveId(
        data.ownerId,
        dimension.id,
        block.location.x,
        block.location.y,
        block.location.z
      );
      const invComp = player.getComponent(EntityComponentTypes.Inventory);
      const inv = invComp?.container;
      if (inv) {
        for (let i = 0; i < inv.size; i++) {
          const item = inv.getItem(i);
          if (item && item.typeId === "minecraft:paper") {
            const itemGraveId = item.getDynamicProperty("grave_id");
            if (itemGraveId === targetGraveId || !itemGraveId && item.nameTag === `${GRAVE_PAPER_PREFIX} [X: ${block.location.x}, Y: ${block.location.y}, Z: ${block.location.z}]`) {
              inv.setItem(i, void 0);
            }
          }
        }
      }
      const equippable = player.getComponent(EntityComponentTypes.Equippable);
      if (equippable) {
        const offhandItem = equippable.getEquipment(EquipmentSlot4.Offhand);
        if (offhandItem && offhandItem.typeId === "minecraft:paper") {
          const itemGraveId = offhandItem.getDynamicProperty("grave_id");
          if (itemGraveId === targetGraveId || !itemGraveId && offhandItem.nameTag === `${GRAVE_PAPER_PREFIX} [X: ${block.location.x}, Y: ${block.location.y}, Z: ${block.location.z}]`) {
            equippable.setEquipment(EquipmentSlot4.Offhand, void 0);
          }
        }
      }
      if (data.ownerId !== player.id) {
        player.sendMessage(
          `\xA7a${data.ownerName} \u306E\u5893\u304B\u3089\u3059\u3079\u3066\u306E\u30A2\u30A4\u30C6\u30E0\u3092\u56DE\u53CE\u3057\u307E\u3057\u305F\uFF01`
        );
      } else {
        player.sendMessage(`\xA7a\u5893\u304B\u3089\u3059\u3079\u3066\u306E\u30A2\u30A4\u30C6\u30E0\u3092\u56DE\u53CE\u3057\u307E\u3057\u305F\uFF01`);
      }
    } catch (e) {
      console.error("\u5893\u56DE\u53CE\u30A8\u30E9\u30FC: " + e);
    }
  });
}
function handleGraveBeforeBreak(event) {
  const block = event.block;
  const graveKey = `grave_${block.location.x}_${block.location.y}_${block.location.z}`;
  const rawData = world3.getDynamicProperty(graveKey);
  if (typeof rawData === "string") {
    event.cancel = true;
    event.player.sendMessage(
      `\xA7e\u5893\u77F3\u306F\u58CA\u305B\u307E\u305B\u3093\u3002\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u56DE\u53CE\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
    );
  }
}

// src/waypoint/waypoints.ts
import {
  world as world6,
  system as system5,
  EquipmentSlot as EquipmentSlot6
} from "@minecraft/server";

// src/waypoint/waypoint-utils.ts
import {
  world as world5,
  MolangVariableMap
} from "@minecraft/server";

// src/waypoint/store-waypoint.ts
import { world as world4 } from "@minecraft/server";
var STORAGE_KEY = "waypoints";
var waypoints = /* @__PURE__ */ new Map();
var waypointCache = [];
function updateCache() {
  waypointCache = Array.from(waypoints.values());
}
function formatDimId(dimId) {
  return dimId.replace(/^minecraft:/, "");
}
function createWaypointId(dim, pos) {
  const shortDim = formatDimId(dim);
  const x = Math.floor(pos.x);
  const y = Math.floor(pos.y);
  const z = Math.floor(pos.z);
  return `${shortDim}@${x},${y},${z}`;
}
function saveToStorage() {
  try {
    const plainObj = Object.fromEntries(waypoints);
    world4.setDynamicProperty(STORAGE_KEY, JSON.stringify(plainObj));
  } catch (e) {
    console.error(`[Waypoints] \u4FDD\u5B58\u306B\u5931\u6557\u3057\u307E\u3057\u305F:`, e);
  }
}
function addWaypoint(dimension, location, color, name) {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);
  const newWaypoint = {
    dim: formatDimId(dimId),
    pos: {
      x: location.x,
      y: location.y,
      z: location.z
    },
    color,
    name
  };
  waypoints.set(id, newWaypoint);
  updateCache();
  saveToStorage();
  return newWaypoint;
}
function deleteWaypoint(dimension, location) {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);
  const existed = waypoints.delete(id);
  updateCache();
  if (existed) {
    saveToStorage();
  }
  return existed;
}

// src/waypoint/waypoint.types.ts
var BANNER_COLOR_NAMES = {
  0: "black",
  1: "red",
  2: "green",
  3: "brown",
  4: "blue",
  5: "purple",
  6: "cyan",
  7: "light_gray",
  8: "gray",
  9: "pink",
  10: "lime",
  11: "yellow",
  12: "light_blue",
  13: "magenta",
  14: "orange",
  15: "white"
};
var BANNER_COLOR_RGBS = {
  black: { r: 0.1137, g: 0.1137, b: 0.1294 },
  red: { r: 0.6902, g: 0.1804, b: 0.149 },
  green: { r: 0.3686, g: 0.4863, b: 0.0863 },
  brown: { r: 0.5137, g: 0.3294, b: 0.1961 },
  blue: { r: 0.2353, g: 0.2667, b: 0.6667 },
  purple: { r: 0.5373, g: 0.1961, b: 0.7216 },
  cyan: { r: 0.0863, g: 0.6118, b: 0.6118 },
  light_gray: { r: 0.6157, g: 0.6157, b: 0.5922 },
  gray: { r: 0.2784, g: 0.3098, b: 0.3216 },
  pink: { r: 0.9529, g: 0.5451, b: 0.6667 },
  lime: { r: 0.502, g: 0.7804, b: 0.1216 },
  yellow: { r: 0.9961, g: 0.8471, b: 0.2392 },
  light_blue: { r: 0.2275, g: 0.702, b: 0.8549 },
  magenta: { r: 0.7804, g: 0.3059, b: 0.7412 },
  orange: { r: 0.9765, g: 0.502, b: 0.1137 },
  white: { r: 0.9765, g: 1, b: 0.9961 }
};

// src/waypoint/virtual-nav.ts
import {
  Player as Player6,
  system as system4,
  EquipmentSlot as EquipmentSlot5
} from "@minecraft/server";
var SPHERE_RADIUS = 30;
var PRE_STEP_DISTANCE = 50;
var ZOOM_ANIM_DURATION_TICKS = 10;
var COS_15_DEG = Math.cos(15 * Math.PI / 180);
var playerVirtualNavMap = /* @__PURE__ */ new Map();
var playerFocusedWaypointMap = /* @__PURE__ */ new Map();
function getWaypointKey(wp) {
  const shortDim = wp.dim.replace(/^minecraft:/, "");
  return `${shortDim}@${Math.floor(wp.pos.x)},${Math.floor(wp.pos.y)},${Math.floor(wp.pos.z)}`;
}
function normalize(v) {
  const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  if (len === 0) return { x: 0, y: 0, z: 1 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}
function getPlayerVirtualNav(player) {
  return playerVirtualNavMap.get(player.id);
}
function getPinnedWaypointKey(player) {
  const state = playerVirtualNavMap.get(player.id);
  return state?.pinnedWaypointKey ?? null;
}
function isPlayerHoldingCompass(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return false;
    const mainhand = equippable.getEquipment(EquipmentSlot5.Mainhand);
    return mainhand?.typeId === "minecraft:compass";
  } catch {
    return false;
  }
}
function getFocusedWaypoint(player) {
  return playerFocusedWaypointMap.get(player.id) ?? null;
}
function getCurrentVirtualOffset(player) {
  const state = playerVirtualNavMap.get(player.id);
  if (!state) return { x: 0, y: 0, z: 0 };
  const currentTick = system4.currentTick;
  const elapsed = currentTick - state.animStartTick;
  if (elapsed >= state.animDurationTicks) {
    return { ...state.targetOffset };
  }
  if (elapsed <= 0) {
    return { ...state.startOffset };
  }
  const p = Math.min(1, Math.max(0, elapsed / state.animDurationTicks));
  const easeOut = 1 - Math.pow(1 - p, 3);
  return {
    x: state.startOffset.x + (state.targetOffset.x - state.startOffset.x) * easeOut,
    y: state.startOffset.y + (state.targetOffset.y - state.startOffset.y) * easeOut,
    z: state.startOffset.z + (state.targetOffset.z - state.startOffset.z) * easeOut
  };
}
function getVirtualHeadLocation(player) {
  const headLoc = player.getHeadLocation();
  const offset = getCurrentVirtualOffset(player);
  return {
    x: headLoc.x + offset.x,
    y: headLoc.y + offset.y,
    z: headLoc.z + offset.z
  };
}
function findRayClosestWaypoint(origin, direction, dimensionId) {
  let closest = null;
  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;
    const dx = wp.pos.x - origin.x;
    const dy = wp.pos.y - origin.y;
    const dz = wp.pos.z - origin.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq);
    if (dist < 0.1) continue;
    const t = direction.x * dx + direction.y * dy + direction.z * dz;
    if (t <= 0) continue;
    const cosTheta = t / dist;
    if (cosTheta < COS_15_DEG) continue;
    const perpDist = Math.sqrt(Math.max(0, distSq - t * t));
    if (!closest || perpDist < closest.perpendicularDist) {
      closest = {
        waypoint: wp,
        perpendicularDist: perpDist
      };
    }
  }
  return closest;
}
function getRelative8DirectionArrow(player, targetPos) {
  const headLoc = player.getHeadLocation();
  const viewDir = player.getViewDirection();
  const playerYaw = Math.atan2(viewDir.x, -viewDir.z);
  const dx = targetPos.x - headLoc.x;
  const dz = targetPos.z - headLoc.z;
  const targetYaw = Math.atan2(dx, -dz);
  let diffRad = targetYaw - playerYaw;
  let diffDeg = (diffRad * 180 / Math.PI % 360 + 540) % 360 - 180;
  if (diffDeg >= -22.5 && diffDeg < 22.5) return "\u2191";
  if (diffDeg >= 22.5 && diffDeg < 67.5) return "\u2197";
  if (diffDeg >= 67.5 && diffDeg < 112.5) return "\u2192";
  if (diffDeg >= 112.5 && diffDeg < 157.5) return "\u2198";
  if (diffDeg >= 157.5 || diffDeg < -157.5) return "\u2193";
  if (diffDeg >= -157.5 && diffDeg < -112.5) return "\u2199";
  if (diffDeg >= -112.5 && diffDeg < -67.5) return "\u2190";
  return "\u2196";
}
function findTargetWaypointSphereFromPreStep(origin50, direction, dimensionId, radius) {
  let bestHit = null;
  const r2 = radius * radius;
  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;
    const dx = origin50.x - wp.pos.x;
    const dy = origin50.y - wp.pos.y;
    const dz = origin50.z - wp.pos.z;
    const c = dx * dx + dy * dy + dz * dz - r2;
    if (c <= 0) {
      if (!bestHit || 0 < bestHit.additionalDistance) {
        bestHit = {
          additionalDistance: 0,
          waypoint: wp
        };
      }
      continue;
    }
    const b = direction.x * dx + direction.y * dy + direction.z * dz;
    const delta = b * b - c;
    if (delta < 0) continue;
    const sqrtDelta = Math.sqrt(delta);
    const sHit = -b - sqrtDelta;
    if (sHit >= 0) {
      if (!bestHit || sHit < bestHit.additionalDistance) {
        bestHit = {
          additionalDistance: sHit,
          waypoint: wp
        };
      }
    }
  }
  return bestHit;
}
function handleCompassVirtualNav(event, cancelCallback) {
  const player = event.source;
  if (!(player instanceof Player6)) return;
  const item = event.itemStack;
  if (!item || item.typeId !== "minecraft:compass") return;
  const currentTick = system4.currentTick;
  let state = playerVirtualNavMap.get(player.id);
  if (!state) {
    state = {
      targetOffset: { x: 0, y: 0, z: 0 },
      startOffset: { x: 0, y: 0, z: 0 },
      animStartTick: currentTick,
      animDurationTicks: ZOOM_ANIM_DURATION_TICKS,
      lastUseTick: 0,
      wasHoldingCompass: true,
      pinnedWaypointKey: null,
      wasShowingHUD: false,
      unpinNoticeUntilTick: 0
    };
    playerVirtualNavMap.set(player.id, state);
  }
  if (currentTick - state.lastUseTick < 5) {
    cancelCallback?.();
    return;
  }
  state.lastUseTick = currentTick;
  cancelCallback?.();
  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead = {
    x: headLoc.x + currentOffset.x,
    y: headLoc.y + currentOffset.y,
    z: headLoc.z + currentOffset.z
  };
  if (viewDir.y < -0.85) {
    const pLoc = player.location;
    const currentDim = player.dimension.id.replace(/^minecraft:/, "");
    const matchedWaypoint = waypointCache.find((wp) => {
      if (wp.dim !== currentDim) return false;
      const sameX = Math.floor(pLoc.x) === Math.floor(wp.pos.x);
      const sameZ = Math.floor(pLoc.z) === Math.floor(wp.pos.z);
      const sameY = Math.floor(pLoc.y) === Math.floor(wp.pos.y) || Math.floor(pLoc.y - 0.5) === Math.floor(wp.pos.y) || Math.abs(pLoc.y - wp.pos.y) <= 1.8;
      return sameX && sameZ && sameY;
    });
    if (matchedWaypoint) {
      deleteWaypoint(player.dimension, matchedWaypoint.pos);
      const deletedKey = getWaypointKey(matchedWaypoint);
      if (state.pinnedWaypointKey === deletedKey) {
        state.pinnedWaypointKey = null;
      }
      try {
        player.sendMessage(`\xA7c[Waypoint] \xA7f${matchedWaypoint.name} \xA7c\u3092\u524A\u9664\u3057\u307E\u3057\u305F`);
        player.onScreenDisplay.setActionBar(`\xA7c[Waypoint] \xA7f${matchedWaypoint.name} \xA7c\u3092\u524A\u9664\u3057\u307E\u3057\u305F`);
        player.playSound("random.break", { pitch: 1.2, volume: 1 });
      } catch {
      }
      return;
    }
  }
  if (player.isSneaking) {
    const closestHit = findRayClosestWaypoint(virtHead, viewDir, player.dimension.id);
    if (closestHit) {
      const key = getWaypointKey(closestHit.waypoint);
      state.pinnedWaypointKey = key;
      state.unpinNoticeUntilTick = 0;
      try {
        player.onScreenDisplay.setActionBar(
          `\xA76[Waypoint] \xA7f${closestHit.waypoint.name} \xA76\u3092\u56FA\u5B9A\u3057\u307E\u3057\u305F`
        );
        player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
      } catch {
      }
    } else if (state.pinnedWaypointKey !== null) {
      state.pinnedWaypointKey = null;
      state.unpinNoticeUntilTick = currentTick + 15;
      state.wasShowingHUD = true;
      try {
        player.onScreenDisplay.setActionBar("\xA77[\u56FA\u5B9A\u89E3\u9664]");
        player.playSound("random.break", { pitch: 1, volume: 0.8 });
      } catch {
      }
    }
    return;
  }
  const baseOffset = { ...state.targetOffset };
  const origin = {
    x: headLoc.x + baseOffset.x,
    y: headLoc.y + baseOffset.y,
    z: headLoc.z + baseOffset.z
  };
  const origin50 = {
    x: origin.x + viewDir.x * PRE_STEP_DISTANCE,
    y: origin.y + viewDir.y * PRE_STEP_DISTANCE,
    z: origin.z + viewDir.z * PRE_STEP_DISTANCE
  };
  const hit = findTargetWaypointSphereFromPreStep(
    origin50,
    viewDir,
    player.dimension.id,
    SPHERE_RADIUS
  );
  let totalStep;
  let targetName = null;
  if (hit) {
    totalStep = PRE_STEP_DISTANCE + hit.additionalDistance;
    targetName = hit.waypoint.name;
  } else {
    totalStep = PRE_STEP_DISTANCE;
  }
  const deltaX = viewDir.x * totalStep;
  const deltaY = viewDir.y * totalStep;
  const deltaZ = viewDir.z * totalStep;
  state.startOffset = currentOffset;
  state.targetOffset = {
    x: baseOffset.x + deltaX,
    y: baseOffset.y + deltaY,
    z: baseOffset.z + deltaZ
  };
  state.animStartTick = currentTick;
  state.animDurationTicks = ZOOM_ANIM_DURATION_TICKS;
  const totalDist = Math.round(
    Math.sqrt(
      state.targetOffset.x * state.targetOffset.x + state.targetOffset.y * state.targetOffset.y + state.targetOffset.z * state.targetOffset.z
    )
  );
  const roundedStep = Math.round(totalStep);
  try {
    if (targetName) {
      player.onScreenDisplay.setActionBar(
        `\xA7b[Waypoint] \xA7f${targetName} \xA7b\u306E30m\u624B\u524D\u3078\u30BA\u30FC\u30E0 (+${roundedStep}m, \u7D2F\u8A08: ${totalDist}m)`
      );
    } else {
      player.onScreenDisplay.setActionBar(
        `\xA7b[Waypoint] \u8996\u7DDA\u65B9\u5411\u3078\u524D\u9032: +${roundedStep}m (\u7D2F\u8A08: ${totalDist}m)`
      );
    }
    player.playSound("random.click", { pitch: 1.3, volume: 0.8 });
  } catch {
  }
}
function updatePlayerVirtualNavHUD(player) {
  const currentTick = system4.currentTick;
  let state = playerVirtualNavMap.get(player.id);
  if (!state) {
    state = {
      targetOffset: { x: 0, y: 0, z: 0 },
      startOffset: { x: 0, y: 0, z: 0 },
      animStartTick: currentTick,
      animDurationTicks: ZOOM_ANIM_DURATION_TICKS,
      lastUseTick: 0,
      wasHoldingCompass: false,
      pinnedWaypointKey: null,
      wasShowingHUD: false,
      unpinNoticeUntilTick: 0
    };
    playerVirtualNavMap.set(player.id, state);
  }
  const isHolding = isPlayerHoldingCompass(player);
  if (state.wasHoldingCompass && !isHolding) {
    const currentOffset2 = getCurrentVirtualOffset(player);
    const hasOffset = Math.abs(currentOffset2.x) > 0.01 || Math.abs(currentOffset2.y) > 0.01 || Math.abs(currentOffset2.z) > 0.01;
    if (hasOffset || state.targetOffset.x !== 0 || state.targetOffset.y !== 0 || state.targetOffset.z !== 0) {
      state.startOffset = currentOffset2;
      state.targetOffset = { x: 0, y: 0, z: 0 };
      state.animStartTick = currentTick;
      state.animDurationTicks = ZOOM_ANIM_DURATION_TICKS;
    }
  }
  state.wasHoldingCompass = isHolding;
  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead = {
    x: headLoc.x + currentOffset.x,
    y: headLoc.y + currentOffset.y,
    z: headLoc.z + currentOffset.z
  };
  let activeWaypoint = null;
  let isPinnedActive = false;
  let pinnedWp = null;
  if (state.pinnedWaypointKey) {
    for (const wp of waypointCache) {
      if (getWaypointKey(wp) === state.pinnedWaypointKey) {
        pinnedWp = wp;
        break;
      }
    }
    if (!pinnedWp) {
      state.pinnedWaypointKey = null;
    }
  }
  if (isHolding && player.isSneaking) {
    const closestHit = findRayClosestWaypoint(virtHead, viewDir, player.dimension.id);
    if (closestHit) {
      activeWaypoint = closestHit.waypoint;
      isPinnedActive = pinnedWp !== null && getWaypointKey(activeWaypoint) === state.pinnedWaypointKey;
    } else if (pinnedWp) {
      activeWaypoint = pinnedWp;
      isPinnedActive = true;
    }
  } else {
    if (pinnedWp) {
      activeWaypoint = pinnedWp;
      isPinnedActive = true;
    }
  }
  playerFocusedWaypointMap.set(player.id, activeWaypoint);
  if (activeWaypoint) {
    const dx = activeWaypoint.pos.x - headLoc.x;
    const dy = activeWaypoint.pos.y - headLoc.y;
    const dz = activeWaypoint.pos.z - headLoc.z;
    const realDist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
    const arrow = getRelative8DirectionArrow(player, activeWaypoint.pos);
    try {
      if (isPinnedActive) {
        player.onScreenDisplay.setActionBar(
          `\xA76[\u56FA\u5B9A] \xA7e${activeWaypoint.name} \xA7f${realDist}m \xA7b${arrow}`
        );
      } else {
        player.onScreenDisplay.setActionBar(
          `\xA7e${activeWaypoint.name} \xA7f${realDist}m \xA7b${arrow}`
        );
      }
      state.wasShowingHUD = true;
    } catch {
    }
  } else if (currentTick < state.unpinNoticeUntilTick) {
    try {
      player.onScreenDisplay.setActionBar("\xA77[\u56FA\u5B9A\u89E3\u9664]");
    } catch {
    }
    state.wasShowingHUD = true;
  } else if (state.wasShowingHUD) {
    try {
      player.onScreenDisplay.setActionBar(" ");
    } catch {
    }
    state.wasShowingHUD = false;
  }
}

// src/waypoint/waypoint-utils.ts
function spawnWaypointParticle(options) {
  const { dimension, location, color, size, durationTicks } = options;
  if (!location) return;
  const dim = typeof dimension === "string" ? world5.getDimension(
    dimension.includes(":") ? dimension : `minecraft:${dimension}`
  ) : dimension;
  const lifetimeSeconds = Math.max(0.05, durationTicks / 20);
  const molang = new MolangVariableMap();
  molang.setFloat("variable.marker_size", Math.max(0.01, size));
  molang.setFloat("variable.color.r", color.r);
  molang.setFloat("variable.color.g", color.g);
  molang.setFloat("variable.color.b", color.b);
  molang.setFloat("variable.lifetime", lifetimeSeconds);
  molang.setColorRGB("variable.color", {
    red: color.r,
    green: color.g,
    blue: color.b
  });
  dim.spawnParticle("mining_utility:hud_marker", location, molang);
}
function spawnWaypointParticleForPlayer(options) {
  const { player, location, color, size, durationTicks, dimension } = options;
  if (!player || !player.isValid || !location) return;
  if (dimension) {
    const dimId = typeof dimension === "string" ? dimension.includes(":") ? dimension : `minecraft:${dimension}` : dimension.id;
    if (player.dimension.id !== dimId) return;
  }
  const lifetimeSeconds = Math.max(0.05, durationTicks / 20);
  const molang = new MolangVariableMap();
  molang.setFloat("variable.marker_size", Math.max(0.01, size));
  molang.setFloat("variable.color.r", color.r);
  molang.setFloat("variable.color.g", color.g);
  molang.setFloat("variable.color.b", color.b);
  molang.setFloat("variable.lifetime", lifetimeSeconds);
  molang.setColorRGB("variable.color", {
    red: color.r,
    green: color.g,
    blue: color.b
  });
  try {
    player.spawnParticle("mining_utility:hud_marker", location, molang);
  } catch (e) {
    console.error("[WaypointUtils] \u30D7\u30EC\u30A4\u30E4\u30FC\u5C02\u7528\u30D1\u30FC\u30C6\u30A3\u30AF\u30EB\u8868\u793A\u30A8\u30E9\u30FC:", e);
  }
}
var HUD_GRAY_COLOR = { r: 0.45, g: 0.45, b: 0.45 };
var HUD_MARKER_CONFIG = {
  baseSize: 1,
  projectionDistance: 1.5,
  minSize: 0.03,
  maxSize: 2.5,
  focusZoom: 2
};
function displayHUDWaypoints(player) {
  if (!isPlayerHoldingCompass(player)) return;
  const headLoc = player.getHeadLocation();
  const dimension = player.dimension;
  const offset = getCurrentVirtualOffset(player);
  const isVirtual = Math.abs(offset.x) > 0.05 || Math.abs(offset.y) > 0.05 || Math.abs(offset.z) > 0.05;
  const focusedWp = getFocusedWaypoint(player);
  const focusedKey = focusedWp ? getWaypointKey(focusedWp) : null;
  const pinnedKey = getPinnedWaypointKey(player);
  const isGrayMode = pinnedKey !== null && !player.isSneaking;
  const originX = headLoc.x + offset.x;
  const originY = headLoc.y + offset.y;
  const originZ = headLoc.z + offset.z;
  for (let waypoint of waypointCache) {
    try {
      const waypointDimension = waypoint.dim.includes(":") ? waypoint.dim : `minecraft:${waypoint.dim}`;
      if (waypointDimension !== dimension.id) continue;
      const targetX = waypoint.pos.x;
      const targetY = waypoint.pos.y;
      const targetZ = waypoint.pos.z;
      const dx = targetX - originX;
      const dy = targetY - (originY - 0.5);
      const dz = targetZ - originZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!isVirtual && dist < 4) continue;
      const safeDist = Math.max(0.1, dist);
      const projDist = HUD_MARKER_CONFIG.projectionDistance;
      const projX = headLoc.x + dx / safeDist * projDist;
      const projY = headLoc.y + dy / safeDist * projDist;
      const projZ = headLoc.z + dz / safeDist * projDist;
      const wpKey = getWaypointKey(waypoint);
      const isFocused = focusedKey !== null && wpKey === focusedKey;
      const sizeMultiplier = isFocused ? HUD_MARKER_CONFIG.focusZoom : 1;
      const apparentSize = HUD_MARKER_CONFIG.baseSize * (projDist / safeDist);
      const finalSize = Math.min(
        HUD_MARKER_CONFIG.maxSize,
        Math.max(HUD_MARKER_CONFIG.minSize, apparentSize) * sizeMultiplier
      );
      const isPinned = pinnedKey !== null && wpKey === pinnedKey;
      const color = isGrayMode && !isPinned ? HUD_GRAY_COLOR : BANNER_COLOR_RGBS[waypoint.color];
      spawnWaypointParticleForPlayer({
        player,
        dimension: waypointDimension,
        location: { x: projX, y: projY, z: projZ },
        color,
        size: finalSize,
        durationTicks: 2
      });
    } catch {
    }
  }
}

// src/waypoint/waypoints.ts
var lastPlacedBannerName = /* @__PURE__ */ new Map();
var playerBannerColorCache = /* @__PURE__ */ new Map();
function initWaypoints() {
  system5.runInterval(() => {
    for (let player of world6.getAllPlayers()) {
      const equippable = player.getComponent("minecraft:equippable");
      if (!equippable) continue;
      const mainhandItem = equippable.getEquipment(EquipmentSlot6.Mainhand);
      if (!mainhandItem || mainhandItem.typeId !== "minecraft:banner") continue;
      for (let [data, colorName] of Object.entries(BANNER_COLOR_NAMES)) {
        const res = player.runCommand(
          `testfor @s [hasitem={item=banner, location=slot.weapon.mainhand, data=${data}}]`
        );
        if (res.successCount > 0) {
          playerBannerColorCache.set(player.id, colorName);
          break;
        }
      }
    }
  }, 4);
  world6.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return;
    if (itemStack.typeId === "minecraft:compass") {
      handleCompassVirtualNav(event, () => {
        event.cancel = true;
      });
      return;
    }
    if (itemStack.typeId === "minecraft:banner") {
      if (itemStack.nameTag !== void 0) {
        lastPlacedBannerName.set(player.id, itemStack.nameTag);
      } else {
        lastPlacedBannerName.set(player.id, null);
      }
    }
  });
  world6.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    if (block.typeId === "minecraft:standing_banner" || block.typeId === "minecraft:wall_banner") {
      const placedName = lastPlacedBannerName.get(player.id);
      const placedColor = playerBannerColorCache.get(player.id);
      player.sendMessage(`\u65D7\u306E\u540D\u524D\u306F ${placedName ?? "\u4E0D\u660E"} \u3067\u3059`);
      player.sendMessage(`\u65D7\u306E\u8272\u306F ${placedColor ?? "\u4E0D\u660E"} \u3067\u3059`);
      if (placedColor && placedName) {
        addWaypoint(
          player.dimension,
          Vector3Utils.add(Vector3Utils.floor(block.location), {
            x: 0.5,
            y: 0.5,
            z: 0.5
          }),
          placedColor,
          placedName
        );
      }
    }
  });
  system5.runInterval(() => {
    for (let waypoint of waypointCache) {
      spawnWaypointParticle({
        dimension: waypoint.dim,
        location: waypoint.pos,
        color: BANNER_COLOR_RGBS[waypoint.color],
        size: 1,
        durationTicks: 11
      });
    }
  }, 10);
  system5.runInterval(() => {
    for (let player of world6.getAllPlayers()) {
      updatePlayerVirtualNavHUD(player);
      displayHUDWaypoints(player);
    }
  }, 1);
}

// src/map.ts
import { world as world7, EquipmentSlot as EquipmentSlot7 } from "@minecraft/server";
var TARGET_MAP_LEVEL = 3;
var MAP_SIZE = 128 * Math.pow(2, TARGET_MAP_LEVEL);
world7.afterEvents.itemUse.subscribe((event) => {
  const player = event.source;
  const item = event.itemStack;
  if (player.isSneaking && item.typeId === "minecraft:filled_map") {
    const x = player.location.x;
    const z = player.location.z;
    const mx = Math.floor((x + 64) / MAP_SIZE);
    const mz = Math.floor((z + 64) / MAP_SIZE);
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return;
    const mainhandItem = equippable.getEquipment(EquipmentSlot7.Mainhand);
    if (mainhandItem && mainhandItem.typeId === "minecraft:filled_map") {
      let baseName = mainhandItem.nameTag ?? "\u5730\u56F3";
      baseName = baseName.replace(/\s*\([+-]?\d+,\s*[+-]?\d+\)$/, "");
      const newName = `${baseName} (${mx}, ${mz})`;
      mainhandItem.nameTag = newName;
      equippable.setEquipment(EquipmentSlot7.Mainhand, mainhandItem);
      player.sendMessage(`\xA7a[\u5730\u56F3] \u540D\u524D\u3092\u5909\u66F4\u3057\u307E\u3057\u305F: \xA7f${newName}`);
    }
  }
});

// src/index.ts
system6.run(() => {
  try {
    world8.gameRules.keepInventory = true;
  } catch {
  }
  initWaypoints();
  console.warn(
    "\xA7a[Mining & Utility Addon] \u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064\u30FB\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u6A5F\u80FD\u304C\u6B63\u5E38\u306B\u30ED\u30FC\u30C9\u3055\u308C\u307E\u3057\u305F\u3002"
  );
});
world8.afterEvents.playerSpawn.subscribe((event) => {
  handleGravePlayerSpawn(event);
});
world8.beforeEvents.playerBreakBlock.subscribe((event) => {
  handleGraveBeforeBreak(event);
});
world8.afterEvents.playerBreakBlock.subscribe((event) => {
  oreMassDestruction(event, ORE_BLOCK_IDS);
  treeMassDestruction(event);
});
world8.beforeEvents.itemUse.subscribe((event) => {
  handleSettingsItemUse(event, () => {
    event.cancel = true;
  });
  handleTorchSwap(event.source, () => {
    event.cancel = true;
  });
});
world8.afterEvents.entityDie.subscribe((event) => {
  handleGraveEntityDie(event);
});
world8.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  handleGraveBeforeInteract(event);
});
system6.afterEvents.scriptEventReceive.subscribe((event) => {
  try {
    handleSettingsScriptEvent(event);
  } catch (error) {
    console.error("\u30A4\u30D9\u30F3\u30C8\u51E6\u7406\u30A8\u30E9\u30FC:", error);
  }
});
export {
  HUD_GRAY_COLOR,
  HUD_MARKER_CONFIG,
  PRE_STEP_DISTANCE,
  SPHERE_RADIUS,
  ZOOM_ANIM_DURATION_TICKS,
  displayHUDWaypoints,
  findRayClosestWaypoint,
  getCurrentVirtualOffset,
  getFocusedWaypoint,
  getPinnedWaypointKey,
  getPlayerVirtualNav,
  getRelative8DirectionArrow,
  getVirtualHeadLocation,
  getWaypointKey,
  handleCompassVirtualNav,
  isPlayerHoldingCompass,
  spawnWaypointParticle,
  spawnWaypointParticleForPlayer,
  updatePlayerVirtualNavHUD
};
