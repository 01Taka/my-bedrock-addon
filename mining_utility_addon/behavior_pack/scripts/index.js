// src/index.ts
import { world as world10, system as system7 } from "@minecraft/server";

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
  EquipmentSlot as EquipmentSlot3,
  GameMode,
  system as system3
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
  world as world2,
  Player as Player3,
  system as system2
} from "@minecraft/server";
import { ModalFormData } from "@minecraft/server-ui";

// src/grave.ts
import {
  world,
  system,
  EquipmentSlot as EquipmentSlot2,
  EntityComponentTypes,
  BlockComponentTypes,
  ItemStack as ItemStack2,
  Player as Player2
} from "@minecraft/server";
var RECOVERY_COMPASS_SETTING_KEY = "setting_recovery_compass";
var cachedRecoveryCompassMode;
function getRecoveryCompassMode() {
  try {
    const val = world.getDynamicProperty(RECOVERY_COMPASS_SETTING_KEY);
    if (typeof val === "number" && (val === 1 || val === 2 || val === 3)) {
      cachedRecoveryCompassMode = val;
      return val;
    }
  } catch (e) {
  }
  if (cachedRecoveryCompassMode !== void 0) {
    return cachedRecoveryCompassMode;
  }
  return 1;
}
function setRecoveryCompassMode(mode) {
  cachedRecoveryCompassMode = mode;
  try {
    world.setDynamicProperty(RECOVERY_COMPASS_SETTING_KEY, mode);
  } catch (e) {
    console.error("\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u8A2D\u5B9A\u4FDD\u5B58\u30A8\u30E9\u30FC:", e);
  }
}
function getRecoveryCompassModeDescription(mode) {
  switch (mode) {
    case 1:
      return "lost (\u5893\u306E\u4E2D\u306B\u542B\u3081\u308B\u30FB\u30C7\u30D5\u30A9\u30EB\u30C8)";
    case 2:
      return "keep (\u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u5185\u306B\u30AD\u30FC\u30D7)";
    case 3:
      return "give (\u30AD\u30FC\u30D7\uFF0B\u672A\u6240\u6301\u306A\u3089\u81EA\u52D5\u4ED8\u4E0E)";
  }
}
var pendingCompassGrantPlayerIds = /* @__PURE__ */ new Set();
var recoveringGraveKeys = /* @__PURE__ */ new Set();
function giveRecoveryCompassIfMissing(player) {
  try {
    const invComp = player.getComponent(EntityComponentTypes.Inventory);
    const inv = invComp?.container;
    if (!inv) return false;
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item && item.typeId === "minecraft:recovery_compass") {
        return false;
      }
    }
    const equippable = player.getComponent(EntityComponentTypes.Equippable);
    if (equippable) {
      const offhand = equippable.getEquipment(EquipmentSlot2.Offhand);
      if (offhand && offhand.typeId === "minecraft:recovery_compass") {
        return false;
      }
    }
    inv.addItem(new ItemStack2("minecraft:recovery_compass", 1));
    return true;
  } catch (e) {
    console.error("\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u4ED8\u4E0E\u30A8\u30E9\u30FC:", e);
    return false;
  }
}
function handleGravePlayerSpawn(player) {
  const compassMode = getRecoveryCompassMode();
  if (compassMode === 3 && pendingCompassGrantPlayerIds.has(player.id)) {
    pendingCompassGrantPlayerIds.delete(player.id);
    system.run(() => {
      if (giveRecoveryCompassIfMissing(player)) {
        player.sendMessage("\xA7a[\u5893] \u6B7B\u4EA1\u5730\u70B9\u3092\u793A\u3059\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u3092\u4ED8\u4E0E\u3057\u307E\u3057\u305F\u3002");
      }
    });
  }
}
function handleGraveEntityDie(event) {
  const deadEntity = event.deadEntity;
  if (!(deadEntity instanceof Player2)) return;
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
  const compassMode = getRecoveryCompassMode();
  let hasRecoveryCompass = false;
  const items = [];
  const invComp = player.getComponent(EntityComponentTypes.Inventory);
  const inv = invComp?.container;
  if (inv) {
    for (let i = 0; i < inv.size; i++) {
      const item = inv.getItem(i);
      if (item) {
        if (item.typeId === "minecraft:recovery_compass") {
          hasRecoveryCompass = true;
          if (compassMode === 2 || compassMode === 3) {
            continue;
          }
        }
        items.push(item.clone());
      }
    }
  }
  const equippable = player.getComponent(EntityComponentTypes.Equippable);
  const slots = [
    EquipmentSlot2.Head,
    EquipmentSlot2.Chest,
    EquipmentSlot2.Legs,
    EquipmentSlot2.Feet,
    EquipmentSlot2.Offhand
  ];
  if (equippable) {
    for (const slot of slots) {
      const item = equippable.getEquipment(slot);
      if (item) {
        if (item.typeId === "minecraft:recovery_compass") {
          hasRecoveryCompass = true;
          if (compassMode === 2 || compassMode === 3) {
            continue;
          }
        }
        items.push(item.clone());
      }
    }
  }
  if (compassMode === 3 && !hasRecoveryCompass) {
    pendingCompassGrantPlayerIds.add(playerId);
  }
  if (items.length === 0) {
    if (compassMode === 3 && !hasRecoveryCompass) {
      system.run(() => {
        giveRecoveryCompassIfMissing(player);
      });
    }
    return;
  }
  system.run(() => {
    try {
      let targetMinY = dimension.heightRange.min + 1;
      while (targetMinY < dimension.heightRange.min + 50) {
        const b1 = dimension.getBlock({
          x: basePos.x,
          y: targetMinY,
          z: basePos.z
        });
        const b2 = dimension.getBlock({
          x: basePos.x + 1,
          y: targetMinY,
          z: basePos.z
        });
        if (b1 && b2 && b1.typeId !== "minecraft:barrel" && b1.typeId !== "minecraft:chest" && b2.typeId !== "minecraft:barrel" && b2.typeId !== "minecraft:chest") {
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
      hideBlock1.setType("minecraft:barrel");
      hideBlock2.setType("minecraft:barrel");
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
            if ((compassMode === 2 || compassMode === 3) && item.typeId === "minecraft:recovery_compass") {
              continue;
            }
            inv.setItem(i, void 0);
          }
        }
      }
      if (equippable) {
        for (const slot of slots) {
          const item = equippable.getEquipment(slot);
          if (item) {
            if ((compassMode === 2 || compassMode === 3) && item.typeId === "minecraft:recovery_compass") {
              continue;
            }
            equippable.setEquipment(slot, void 0);
          }
        }
      }
      if (compassMode === 3 && !hasRecoveryCompass) {
        giveRecoveryCompassIfMissing(player);
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
        const graveKey = `grave_${finalPos.x}_${finalPos.y}_${finalPos.z}`;
        const graveData = {
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
        world.setDynamicProperty(graveKey, JSON.stringify(graveData));
        world.sendMessage(
          `\xA7c${playerName} \u306E\u5893\u304C\u751F\u6210\u3055\u308C\u307E\u3057\u305F [X: ${finalPos.x}, Y: ${finalPos.y}, Z: ${finalPos.z}]`
        );
      }
    } catch (e) {
      console.error("\u5893\u751F\u6210\u30A8\u30E9\u30FC: " + e);
    }
  });
}
function handleGraveBeforeInteract(event) {
  const block = event.block;
  const player = event.player;
  const dimension = block.dimension;
  const graveKey = `grave_${block.location.x}_${block.location.y}_${block.location.z}`;
  if (recoveringGraveKeys.has(graveKey)) {
    event.cancel = true;
    return;
  }
  const rawData = world.getDynamicProperty(graveKey);
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
  recoveringGraveKeys.add(graveKey);
  system.run(() => {
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
      world.setDynamicProperty(graveKey, void 0);
      if (data.ownerId !== player.id) {
        player.sendMessage(
          `\xA7a${data.ownerName} \u306E\u5893\u304B\u3089\u3059\u3079\u3066\u306E\u30A2\u30A4\u30C6\u30E0\u3092\u56DE\u53CE\u3057\u307E\u3057\u305F\uFF01`
        );
      } else {
        player.sendMessage(`\xA7a\u5893\u304B\u3089\u3059\u3079\u3066\u306E\u30A2\u30A4\u30C6\u30E0\u3092\u56DE\u53CE\u3057\u307E\u3057\u305F\uFF01`);
      }
    } catch (e) {
      console.error("\u5893\u56DE\u53CE\u30A8\u30E9\u30FC: " + e);
    } finally {
      recoveringGraveKeys.delete(graveKey);
    }
  });
}
function handleGraveBeforeBreak(event) {
  const block = event.block;
  const graveKey = `grave_${block.location.x}_${block.location.y}_${block.location.z}`;
  const rawData = world.getDynamicProperty(graveKey);
  if (typeof rawData === "string") {
    event.cancel = true;
    event.player.sendMessage(
      `\xA7e\u5893\u77F3\u306F\u58CA\u305B\u307E\u305B\u3093\u3002\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u56DE\u53CE\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
    );
  }
}

// src/settings.ts
var SETTING_KEYS = {
  TREE: "setting_tree",
  ORE: "setting_ore",
  TORCH: "setting_torch",
  GRAVE: "setting_grave",
  GRAVE_OTHERS: "setting_grave_others"
};
var worldMemorySettings = /* @__PURE__ */ new Map();
function isSettingEnabled(_player, key = SETTING_KEYS.GRAVE, defaultValue = true) {
  try {
    const val = world2.getDynamicProperty(key);
    if (typeof val === "boolean") {
      return val;
    }
  } catch (e) {
  }
  if (worldMemorySettings.has(key)) {
    return worldMemorySettings.get(key);
  }
  return defaultValue;
}
function setSettingEnabled(_player, key, enabled) {
  try {
    world2.setDynamicProperty(key, enabled);
  } catch (e) {
    console.error(`\u8A2D\u5B9A\u4FDD\u5B58\u30A8\u30E9\u30FC [${key}]:`, e);
  }
  worldMemorySettings.set(key, enabled);
}
function getPlayerSettings(_player) {
  return {
    tree: isSettingEnabled(null, SETTING_KEYS.TREE),
    ore: isSettingEnabled(null, SETTING_KEYS.ORE),
    torch: isSettingEnabled(null, SETTING_KEYS.TORCH),
    grave: isSettingEnabled(null, SETTING_KEYS.GRAVE),
    graveOthers: isSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS)
  };
}
function isPlayerAdmin(player) {
  try {
    if (typeof player.isOp === "function" && player.isOp()) {
      return true;
    }
  } catch {
  }
  if (player.hasTag("admin") || player.hasTag("op")) {
    return true;
  }
  if (world2.getAllPlayers().length <= 1) {
    return true;
  }
  return false;
}
function showSettingsForm(player) {
  if (!isPlayerAdmin(player)) {
    player.sendMessage("\xA7c[\u8A2D\u5B9A] \u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A\u3092\u5909\u66F4\u3059\u308B\u6A29\u9650\uFF08OP\u6A29\u9650\u307E\u305F\u306Fadmin\u30BF\u30B0\uFF09\u304C\u3042\u308A\u307E\u305B\u3093\u3002");
    return;
  }
  const current = getPlayerSettings(player);
  const currentCompassMode = getRecoveryCompassMode();
  const form = new ModalFormData();
  form.title("\xA7l\xA76\u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064\u8A2D\u5B9A (\u30EF\u30FC\u30EB\u30C9\u5171\u901A)");
  form.toggle("\u6728\u306E\u7834\u58CA (\u4E00\u62EC\u4F10\u63A1)", { defaultValue: current.tree });
  form.toggle("\u9271\u77F3\u306E\u7834\u58CA (\u4E00\u62EC\u63A1\u6398)", { defaultValue: current.ore });
  form.toggle("\u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064 (\u52D5\u7684\u5149\u6E90\u30FB\u6301\u3061\u66FF\u3048)", {
    defaultValue: current.torch
  });
  form.toggle("\u5893\u6A5F\u80FD (\u6B7B\u4EA1\u6642\u30A2\u30A4\u30C6\u30E0\u4FDD\u8B77)", { defaultValue: current.grave });
  form.toggle("\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE (\u4ED6\u4EBA\u306E\u5893\u77F3\u3092\u958B\u3051\u308B)", {
    defaultValue: current.graveOthers
  });
  form.dropdown(
    "\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u306E\u6271\u3044",
    [
      "lost: \u5893\u306E\u4E2D\u306B\u542B\u3081\u308B (\u30C7\u30D5\u30A9\u30EB\u30C8)",
      "keep: \u30A4\u30F3\u30D9\u30F3\u30C8\u30EA\u5185\u306B\u30AD\u30FC\u30D7",
      "give: \u30AD\u30FC\u30D7\uFF0B\u672A\u6240\u6301\u306A\u3089\u81EA\u52D5\u4ED8\u4E0E"
    ],
    { defaultValueIndex: currentCompassMode - 1 }
  );
  form.show(player).then((response) => {
    if (response.canceled || !response.formValues) return;
    const [
      treeVal,
      oreVal,
      torchVal,
      graveVal,
      graveOthersVal,
      compassIndex
    ] = response.formValues;
    setSettingEnabled(null, SETTING_KEYS.TREE, treeVal);
    setSettingEnabled(null, SETTING_KEYS.ORE, oreVal);
    setSettingEnabled(null, SETTING_KEYS.TORCH, torchVal);
    setSettingEnabled(null, SETTING_KEYS.GRAVE, graveVal);
    setSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS, graveOthersVal);
    world2.gameRules.keepInventory = graveVal;
    let compassMsg = "";
    if (typeof compassIndex === "number") {
      const newCompassMode = compassIndex + 1;
      if (newCompassMode !== currentCompassMode) {
        setRecoveryCompassMode(newCompassMode);
      }
      compassMsg = `\u30FB\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9: \xA7e${getRecoveryCompassModeDescription(newCompassMode)}\xA7f
`;
    }
    const statusText = (val) => val ? "\xA7a[ON]\xA7r" : "\xA7c[OFF]\xA7r";
    world2.sendMessage(
      `\xA7a============================
\xA76\u3010\u30EF\u30FC\u30EB\u30C9\u5171\u901A\u8A2D\u5B9A\u3092\u66F4\u65B0\u3057\u307E\u3057\u305F\u3011 (\u5909\u66F4\u8005: ${player.name})
\xA7f\u30FB\u6728\u306E\u7834\u58CA: ${statusText(treeVal)}
\u30FB\u9271\u77F3\u306E\u7834\u58CA: ${statusText(oreVal)}
\u30FB\u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064: ${statusText(torchVal)}
\u30FB\u5893\u6A5F\u80FD: ${statusText(graveVal)}
\u30FB\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE: ${statusText(graveOthersVal)}
` + compassMsg + `\xA7a============================`
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
  const allOnlinePlayers = world2.getAllPlayers();
  let targets = [];
  if (event.sourceEntity && (event.sourceEntity instanceof Player3 || event.sourceEntity.typeId === "minecraft:player")) {
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
  const isServerSource = !(event.sourceEntity instanceof Player3);
  switch (cmd) {
    case "menu":
    case "setting":
    case "settings":
    case "config":
    case "ui": {
      system2.run(() => {
        showSettingsForm(primaryPlayer);
      });
      break;
    }
    case "tree": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.TREE);
      setSettingEnabled(null, SETTING_KEYS.TREE, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
      }
      world2.sendMessage(
        `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u6728\u306E\u7834\u58CA (\u4E00\u62EC\u4F10\u63A1) \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
      );
      break;
    }
    case "ore": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.ORE);
      setSettingEnabled(null, SETTING_KEYS.ORE, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
      }
      world2.sendMessage(
        `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u9271\u77F3\u306E\u7834\u58CA (\u4E00\u62EC\u63A1\u6398) \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
      );
      break;
    }
    case "torch": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.TORCH);
      setSettingEnabled(null, SETTING_KEYS.TORCH, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
      }
      world2.sendMessage(
        `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064 \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
      );
      break;
    }
    case "grave": {
      if (arg === "lost" || arg === "1" || arg === "all") {
        setRecoveryCompassMode(1);
        world2.sendMessage(
          `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u8A2D\u5B9A\u3092 \xA7e\u300C${getRecoveryCompassModeDescription(1)}\u300D\xA76 \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
        break;
      }
      if (arg === "keep" || arg === "2") {
        setRecoveryCompassMode(2);
        world2.sendMessage(
          `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u8A2D\u5B9A\u3092 \xA7e\u300C${getRecoveryCompassModeDescription(2)}\u300D\xA76 \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
        break;
      }
      if (arg === "give" || arg === "auto" || arg === "3") {
        setRecoveryCompassMode(3);
        world2.sendMessage(
          `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u8A2D\u5B9A\u3092 \xA7e\u300C${getRecoveryCompassModeDescription(3)}\u300D\xA76 \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
        break;
      }
      let next;
      if (arg === "on" || arg === "true") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.GRAVE);
      world2.gameRules.keepInventory = next;
      setSettingEnabled(null, SETTING_KEYS.GRAVE, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
      }
      world2.sendMessage(
        `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u5893\u6A5F\u80FD \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
      );
      break;
    }
    case "compass": {
      let targetMode = null;
      if (arg === "lost" || arg === "1" || arg === "all") targetMode = 1;
      else if (arg === "keep" || arg === "2") targetMode = 2;
      else if (arg === "give" || arg === "auto" || arg === "3") targetMode = 3;
      if (targetMode !== null) {
        setRecoveryCompassMode(targetMode);
        world2.sendMessage(
          `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u8A2D\u5B9A\u3092 \xA7e\u300C${getRecoveryCompassModeDescription(targetMode)}\u300D\xA76 \u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
        );
      } else {
        const currentMode = getRecoveryCompassMode();
        primaryPlayer.sendMessage(
          `\xA76[\u8A2D\u5B9A] \u73FE\u5728\u306E\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u8A2D\u5B9A: \xA7e${getRecoveryCompassModeDescription(currentMode)}
\xA77\u4F7F\u7528\u65B9\u6CD5: /scriptevent addon:grave [lost|keep|give]`
        );
      }
      break;
    }
    case "grave_others":
    case "graveothers": {
      let next;
      if (arg === "on" || arg === "true" || arg === "1") next = true;
      else if (arg === "off" || arg === "false" || arg === "0") next = false;
      else next = !isSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS);
      setSettingEnabled(null, SETTING_KEYS.GRAVE_OTHERS, next);
      for (const p of targets) {
        try {
          p.playSound(next ? "random.orb" : "random.break", { pitch: 1.2, volume: 0.8 });
        } catch {
        }
      }
      world2.sendMessage(
        `\xA76[\u30EF\u30FC\u30EB\u30C9\u8A2D\u5B9A] \u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE \u3092 ${next ? "\xA7a[ON]" : "\xA7c[OFF]"} \xA76\u306B\u5909\u66F4\u3057\u307E\u3057\u305F\u3002`
      );
      break;
    }
    case "status": {
      const settings = getPlayerSettings();
      const compassMode = getRecoveryCompassMode();
      const statusText = (val) => val ? "\xA7a[ON]\xA7r" : "\xA7c[OFF]\xA7r";
      const statusMsg = `\xA7a============================
\xA76\u3010\u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064\u8A2D\u5B9A (\u30EF\u30FC\u30EB\u30C9\u5171\u901A)\u3011
\xA7f\u30FB\u6728\u306E\u7834\u58CA: ${statusText(settings.tree)}
\u30FB\u9271\u77F3\u306E\u7834\u58CA: ${statusText(settings.ore)}
\u30FB\u30AA\u30D5\u30CF\u30F3\u30C9\u305F\u3044\u307E\u3064: ${statusText(settings.torch)}
\u30FB\u5893\u6A5F\u80FD: ${statusText(settings.grave)}
\u30FB\u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE: ${statusText(settings.graveOthers)}
\u30FB\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9: \xA7e${getRecoveryCompassModeDescription(compassMode)}\xA7r
\xA77(\u6728\u306E\u5263\u306E\u9577\u62BC\u3057/\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u8A2D\u5B9A\u753B\u9762\u3092\u958B\u304F)
\xA7a============================`;
      world2.sendMessage(statusMsg);
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
\u30FB/scriptevent addon:grave [lost|keep|give] : \u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u306E\u6271\u3044\u8A2D\u5B9A
\u30FB/scriptevent addon:grave_others : \u4ED6\u4EBA\u306E\u5893\u306E\u56DE\u53CE\u306EON/OFF\u5207\u308A\u66FF\u3048
\u30FB/scriptevent addon:status : \u73FE\u5728\u306E\u8A2D\u5B9A\u72B6\u614B\u3092\u78BA\u8A8D
\xA77\u203B \u6728\u306E\u5263 (Wooden Sword) \u3092\u6301\u3063\u3066\u753B\u9762\u9577\u62BC\u3057/\u53F3\u30AF\u30EA\u30C3\u30AF\u3067\u8A2D\u5B9A\u753B\u9762\u304C\u958B\u304D\u307E\u3059\u3002
\xA7a============================`;
      for (const p of targets) {
        p.sendMessage(helpMsg);
      }
      if (isServerSource) {
        world2.sendMessage(helpMsg);
      }
      break;
    }
  }
}
function handleSettingsItemUse(event, cancelCallback) {
  const player = event.source;
  if (!(player instanceof Player3)) return;
  const item = event.itemStack;
  if (!item) return;
  if (item.typeId === "minecraft:wooden_sword") {
    if (!isPlayerAdmin(player)) {
      return;
    }
    cancelCallback();
    system2.run(() => {
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
      const block = dimension.getBlock(position);
      if (block) {
        block.setType("minecraft:air");
      }
    } else {
      const block = dimension.getBlock(position);
      if (block) {
        block.setType("minecraft:air");
      }
    }
  } catch (e) {
  }
}
function batchProcessBlocks(dimension, positions, processFn, player, batchSize = 20) {
  if (positions.length === 0) return;
  let index = 0;
  function processNextBatch() {
    const end = Math.min(index + batchSize, positions.length);
    for (; index < end; index++) {
      processFn(dimension, positions[index], player);
    }
    if (index < positions.length) {
      system3.run(processNextBatch);
    }
  }
  processNextBatch();
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
  if (destroyPositions.length === 0) return;
  if (player.getGameMode() !== GameMode.Creative) {
    const damageToAdd = calculateDurabilityDamage(
      enchant.unbreaking,
      destroyPositions.length
    );
    durability.damage = Math.min(
      durability.maxDurability,
      durability.damage + damageToAdd
    );
    equippable.setEquipment(EquipmentSlot3.Mainhand, mainhandItem);
  }
  batchProcessBlocks(
    event.dimension,
    destroyPositions,
    destroyBlock,
    player,
    20
  );
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
  if (player.getGameMode() !== GameMode.Creative) {
    const damageToAdd = calculateDurabilityDamage(
      enchant.unbreaking,
      treeDestroyPositions.length
    );
    durability.damage = Math.min(
      durability.maxDurability,
      durability.damage + damageToAdd
    );
    equippable.setEquipment(EquipmentSlot3.Mainhand, mainhandItem);
  }
  batchProcessBlocks(
    event.dimension,
    treeDestroyPositions,
    destroyBlock,
    player,
    20
  );
  const validLeafPositions = leafDestroyPositions.filter(
    (pos) => !connectedOtherTreeAround.has(vector3ToString(pos))
  );
  batchProcessBlocks(
    event.dimension,
    validLeafPositions,
    destroyBlock,
    player,
    20
  );
}

// src/offhand-touch.ts
import {
  world as world3,
  system as system4,
  EquipmentSlot as EquipmentSlot4,
  Player as Player5,
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
  const offhandItem = equippable.getEquipment(EquipmentSlot4.Offhand);
  if (!offhandItem) return null;
  const level = TORCH_LIGHT_LEVELS[offhandItem.typeId];
  if (level === void 0) return null;
  return { typeId: offhandItem.typeId, level };
}
function getLightPosKey(dimensionId, pos) {
  return `${dimensionId}@${pos.x},${pos.y},${pos.z}`;
}
var addonPlacedLights = /* @__PURE__ */ new Set();
function isLightNeededByOtherPlayers(excludingPlayerId, dimensionId, position) {
  for (const [pId, lightData] of activeLights.entries()) {
    if (pId === excludingPlayerId) continue;
    if (lightData.dimensionId !== dimensionId) continue;
    for (const loc of lightData.locations) {
      if (Vector3Utils.equals(loc, position)) {
        return true;
      }
    }
  }
  return false;
}
function removeLight(dimension, position, playerId) {
  const key = getLightPosKey(dimension.id, position);
  if (!addonPlacedLights.has(key)) {
    return;
  }
  if (playerId && isLightNeededByOtherPlayers(playerId, dimension.id, position)) {
    return;
  }
  try {
    const block = dimension.getBlock(position);
    if (block && isLightBlock(block.typeId)) {
      block.setType("minecraft:air");
    }
    addonPlacedLights.delete(key);
  } catch (e) {
  }
}
function placeLight(dimension, position, level) {
  try {
    const block = dimension.getBlock(position);
    if (!block || !isAirOrLightBlock(block.typeId)) return false;
    const key = getLightPosKey(dimension.id, position);
    if (isLightBlock(block.typeId) && !addonPlacedLights.has(key)) {
      return false;
    }
    const lightPermutation = BlockPermutation.resolve("minecraft:light_block", {
      block_light_level: level
    });
    block.setPermutation(lightPermutation);
    addonPlacedLights.add(key);
    return true;
  } catch (e) {
    return false;
  }
}
function clearPreviousLight(playerId) {
  const previous = activeLights.get(playerId);
  if (!previous) return;
  try {
    const dimension = world3.getDimension(previous.dimensionId);
    for (const position of previous.locations) {
      removeLight(dimension, position, playerId);
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
system4.runInterval(() => {
  for (const player of world3.getAllPlayers()) {
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
        removeLight(dimension, prevPos, playerId);
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
world3.afterEvents.entityDie.subscribe((event) => {
  if (event.deadEntity instanceof Player5) {
    clearPreviousLight(event.deadEntity.id);
  }
});
world3.afterEvents.playerDimensionChange.subscribe((event) => {
  clearPreviousLight(event.player.id);
});
world3.afterEvents.playerLeave.subscribe((event) => {
  clearPreviousLight(event.playerId);
});
function handleTorchSwap(player, cancelCallback) {
  if (!isSettingEnabled(player, SETTING_KEYS.TORCH)) return;
  if (!player.isSneaking) return;
  const equippable = player.getComponent("minecraft:equippable");
  if (!equippable) return;
  const mainhandItem = equippable.getEquipment(EquipmentSlot4.Mainhand);
  const offhandItem = equippable.getEquipment(EquipmentSlot4.Offhand);
  if (mainhandItem && mainhandItem.typeId in TORCH_LIGHT_LEVELS && !offhandItem) {
    cancelCallback();
    system4.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.offhand 0 ${mainhandItem.typeId} ${mainhandItem.amount}`
      );
      equippable.setEquipment(EquipmentSlot4.Mainhand, void 0);
    });
    return;
  }
  if (!mainhandItem && offhandItem && offhandItem.typeId in TORCH_LIGHT_LEVELS) {
    cancelCallback();
    system4.run(() => {
      player.runCommand(
        `replaceitem entity @s slot.weapon.mainhand 0 ${offhandItem.typeId} ${offhandItem.amount}`
      );
      player.runCommand(`replaceitem entity @s slot.weapon.offhand 0 air`);
    });
    return;
  }
}

// src/waypoint/waypoints.ts
import {
  world as world8,
  system as system6,
  EquipmentSlot as EquipmentSlot6,
  Player as Player8
} from "@minecraft/server";

// src/waypoint/waypoint-utils.ts
import {
  world as world7,
  MolangVariableMap
} from "@minecraft/server";

// src/waypoint/store-waypoint.ts
import { world as world4 } from "@minecraft/server";
var WP_PREFIX = "wp:";
var LEGACY_STORAGE_KEY = "waypoints";
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
function hasWaypointAt(dimension, location) {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);
  return waypoints.has(id);
}
function getWaypointAt(dimension, location) {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);
  return waypoints.get(id);
}
function isWaypoint(value) {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value;
  const pos = candidate.pos;
  return typeof candidate.dim === "string" && typeof candidate.color === "string" && (candidate.name === null || typeof candidate.name === "string") && (candidate.creatorId === void 0 || typeof candidate.creatorId === "string") && (candidate.createdAt === void 0 || typeof candidate.createdAt === "string") && (candidate.source === void 0 || typeof candidate.source === "string") && typeof pos === "object" && pos !== null && typeof pos.x === "number" && typeof pos.y === "number" && typeof pos.z === "number";
}
function loadWaypoints() {
  waypoints.clear();
  try {
    const legacyRaw = world4.getDynamicProperty(LEGACY_STORAGE_KEY);
    if (typeof legacyRaw === "string") {
      const parsed = JSON.parse(legacyRaw);
      if (typeof parsed === "object" && parsed !== null) {
        for (const [key, value] of Object.entries(parsed)) {
          if (isWaypoint(value)) {
            waypoints.set(key, value);
            try {
              world4.setDynamicProperty(`${WP_PREFIX}${key}`, JSON.stringify(value));
            } catch {
            }
          }
        }
      }
      world4.setDynamicProperty(LEGACY_STORAGE_KEY, void 0);
      console.warn(`[Waypoints] \u65E7\u5F62\u5F0F\u30C7\u30FC\u30BF\u304B\u3089 ${waypoints.size} \u4EF6\u3092\u500B\u5225\u30AD\u30FC\u3078\u6B63\u5E38\u79FB\u884C\u3057\u307E\u3057\u305F\u3002`);
    }
  } catch (e) {
    console.warn(`[Waypoints] \u30EC\u30AC\u30B7\u30FC\u30C7\u30FC\u30BF\u79FB\u884C\u51E6\u7406\u30A8\u30E9\u30FC:`, e);
  }
  try {
    const allPropIds = world4.getDynamicPropertyIds();
    for (const propId of allPropIds) {
      if (propId.startsWith(WP_PREFIX)) {
        const raw = world4.getDynamicProperty(propId);
        if (typeof raw === "string") {
          try {
            const parsed = JSON.parse(raw);
            if (isWaypoint(parsed)) {
              const wpKey = propId.substring(WP_PREFIX.length);
              waypoints.set(wpKey, parsed);
            }
          } catch {
          }
        }
      }
    }
    updateCache();
    console.warn(`[Waypoints] \u30ED\u30FC\u30C9\u5B8C\u4E86: ${waypoints.size} \u4EF6\u306E\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u3092\u5FA9\u5143\u3057\u307E\u3057\u305F\u3002`);
  } catch (e) {
    console.warn(`[Waypoints] \u500B\u5225\u30D7\u30ED\u30D1\u30C6\u30A3\u306E\u30ED\u30FC\u30C9\u306B\u5931\u6557\u3057\u307E\u3057\u305F:`, e);
    updateCache();
  }
}
function addWaypoint(dimension, location, color, name, creatorId, createdAt, source) {
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
    name,
    creatorId,
    createdAt: createdAt ?? (/* @__PURE__ */ new Date()).toISOString(),
    source
  };
  waypoints.set(id, newWaypoint);
  updateCache();
  try {
    world4.setDynamicProperty(`${WP_PREFIX}${id}`, JSON.stringify(newWaypoint));
  } catch (e) {
    console.error(`[Waypoints] \u500B\u5225\u30D7\u30ED\u30D1\u30C6\u30A3\u4FDD\u5B58\u30A8\u30E9\u30FC [${id}]:`, e);
  }
  return newWaypoint;
}
function deleteWaypoint(dimension, location) {
  const dimId = typeof dimension === "string" ? dimension : dimension.id;
  const id = createWaypointId(dimId, location);
  const existed = waypoints.delete(id);
  updateCache();
  if (existed) {
    try {
      world4.setDynamicProperty(`${WP_PREFIX}${id}`, void 0);
    } catch (e) {
      console.error(`[Waypoints] \u500B\u5225\u30D7\u30ED\u30D1\u30C6\u30A3\u524A\u9664\u30A8\u30E9\u30FC [${id}]:`, e);
    }
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
var DEATH_COLOR_NAME = "death_red";
var DEATH_COLOR_RGB = { r: 1, g: 0, b: 0 };
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
var WAYPOINT_COLOR_RGBS = {
  ...BANNER_COLOR_RGBS,
  [DEATH_COLOR_NAME]: DEATH_COLOR_RGB
};
var BANNER_COLOR_JAPANESE = {
  black: "\u9ED2",
  red: "\u8D64",
  green: "\u7DD1",
  brown: "\u8336",
  blue: "\u9752",
  purple: "\u7D2B",
  cyan: "\u9752\u7DD1",
  light_gray: "\u8584\u7070\u8272",
  gray: "\u7070\u8272",
  pink: "\u6843\u8272",
  lime: "\u9EC4\u7DD1",
  yellow: "\u9EC4",
  light_blue: "\u7A7A\u8272",
  magenta: "\u8D64\u7D2B",
  orange: "\u6A59",
  white: "\u767D"
};
var WAYPOINT_COLOR_JAPANESE = {
  ...BANNER_COLOR_JAPANESE,
  [DEATH_COLOR_NAME]: "\u6B7B\u4EA1\u5730\u70B9"
};
var BANNER_COLOR_CHAT_CODES = {
  black: "\xA70",
  red: "\xA7c",
  green: "\xA72",
  brown: "\xA76",
  blue: "\xA79",
  purple: "\xA75",
  cyan: "\xA73",
  light_gray: "\xA77",
  gray: "\xA78",
  pink: "\xA7d",
  lime: "\xA7a",
  yellow: "\xA7e",
  light_blue: "\xA7b",
  magenta: "\xA75",
  orange: "\xA76",
  white: "\xA7f"
};
var WAYPOINT_COLOR_CHAT_CODES = {
  ...BANNER_COLOR_CHAT_CODES,
  [DEATH_COLOR_NAME]: "\xA7c"
};
var WAYPOINT_PROXIMITY_RANGE = 4;
function getWaypointRGB(waypoint) {
  if (waypoint.source === "death" || waypoint.color === DEATH_COLOR_NAME) {
    return DEATH_COLOR_RGB;
  }
  return WAYPOINT_COLOR_RGBS[waypoint.color] ?? { r: 1, g: 1, b: 1 };
}
function getWaypointKey(wp) {
  const shortDim = wp.dim.replace(/^minecraft:/, "");
  return `${shortDim}@${Math.floor(wp.pos.x)},${Math.floor(wp.pos.y)},${Math.floor(wp.pos.z)}`;
}
function getWaypointDisplayName(wp) {
  if (wp.name !== null && wp.name.trim() !== "") {
    return wp.name;
  }
  return WAYPOINT_COLOR_JAPANESE[wp.color] ?? "\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8";
}

// src/waypoint/virtual-nav.ts
import {
  world as world6,
  Player as Player6,
  system as system5,
  EquipmentSlot as EquipmentSlot5
} from "@minecraft/server";

// src/waypoint/waypoint-marker.ts
import { world as world5 } from "@minecraft/server";
var WAYPOINT_MARKER_TYPE = "mining_utility:waypoint_marker";
var WAYPOINT_MARKER_TAG = "waypoint_marker";
function getLoweredWaypointKeys() {
  const loweredKeys = /* @__PURE__ */ new Set();
  for (const player of world5.getAllPlayers()) {
    if (!player || !player.isValid) continue;
    const pLoc = player.location;
    const px = Math.floor(pLoc.x);
    const py = Math.floor(pLoc.y);
    const pz = Math.floor(pLoc.z);
    const wpBelow1 = getWaypointAt(player.dimension, {
      x: px,
      y: py - 1,
      z: pz
    });
    if (wpBelow1) {
      loweredKeys.add(getWaypointKey(wpBelow1));
    }
  }
  return loweredKeys;
}
function resolveDimension(dim) {
  try {
    if (typeof dim !== "string") return dim;
    const formatted = dim.includes(":") ? dim : `minecraft:${dim}`;
    return world5.getDimension(formatted);
  } catch {
    return null;
  }
}
function getWaypointMarkerNameTag(waypoint) {
  const colorCode = WAYPOINT_COLOR_CHAT_CODES[waypoint.color] ?? "\xA7f";
  const displayName = getWaypointDisplayName(waypoint);
  return `${colorCode}${displayName}`;
}
function spawnWaypointMarker(dimension, waypoint) {
  if (waypoint.source === "death") return null;
  const dim = resolveDimension(dimension);
  if (!dim) return null;
  const key = getWaypointKey(waypoint);
  try {
    const existing = dim.getEntities({
      type: WAYPOINT_MARKER_TYPE,
      tags: [`wp_id:${key}`]
    });
    if (existing.length > 0) {
      const marker2 = existing[0];
      marker2.nameTag = getWaypointMarkerNameTag(waypoint);
      return marker2;
    }
    const marker = dim.spawnEntity(WAYPOINT_MARKER_TYPE, waypoint.pos);
    marker.nameTag = getWaypointMarkerNameTag(waypoint);
    marker.addTag(WAYPOINT_MARKER_TAG);
    marker.addTag(`wp_id:${key}`);
    return marker;
  } catch {
    return null;
  }
}
function removeWaypointMarker(dimension, waypointKey, location) {
  const dim = resolveDimension(dimension);
  if (!dim) return;
  try {
    const taggedMarkers = dim.getEntities({
      type: WAYPOINT_MARKER_TYPE,
      tags: [`wp_id:${waypointKey}`]
    });
    for (const marker of taggedMarkers) {
      try {
        marker.remove();
      } catch {
      }
    }
    if (location) {
      const nearMarkers = dim.getEntities({
        type: WAYPOINT_MARKER_TYPE,
        location,
        maxDistance: 1.5
      });
      for (const marker of nearMarkers) {
        try {
          marker.remove();
        } catch {
        }
      }
    }
  } catch {
  }
}
function syncWaypointMarkers() {
  const activeKeys = /* @__PURE__ */ new Set();
  const waypointsByKey = /* @__PURE__ */ new Map();
  for (const wp of waypointCache) {
    if (wp.source === "death") continue;
    const key = getWaypointKey(wp);
    activeKeys.add(key);
    waypointsByKey.set(key, wp);
  }
  const loweredKeys = getLoweredWaypointKeys();
  const dimensionIds = [
    "minecraft:overworld",
    "minecraft:nether",
    "minecraft:the_end"
  ];
  for (const dimId of dimensionIds) {
    const dim = resolveDimension(dimId);
    if (!dim) continue;
    try {
      const existingMarkers = dim.getEntities({
        type: WAYPOINT_MARKER_TYPE
      });
      const spawnedKeysInDim = /* @__PURE__ */ new Set();
      for (const marker of existingMarkers) {
        const tags = marker.getTags();
        const idTag = tags.find((t) => t.startsWith("wp_id:"));
        if (idTag) {
          const key = idTag.replace(/^wp_id:/, "");
          if (!activeKeys.has(key)) {
            try {
              marker.remove();
            } catch {
            }
          } else {
            spawnedKeysInDim.add(key);
            const wp = waypointsByKey.get(key);
            if (wp) {
              const expectedNameTag = getWaypointMarkerNameTag(wp);
              if (marker.nameTag !== expectedNameTag) {
                marker.nameTag = expectedNameTag;
              }
              const isLowered = loweredKeys.has(key);
              const targetY = isLowered ? wp.pos.y - 1 : wp.pos.y;
              const targetPos = {
                x: wp.pos.x,
                y: targetY,
                z: wp.pos.z
              };
              const loc = marker.location;
              const dx = loc.x - targetPos.x;
              const dy = loc.y - targetPos.y;
              const dz = loc.z - targetPos.z;
              if (dx * dx + dy * dy + dz * dz > 25e-4) {
                try {
                  marker.teleport(targetPos, { dimension: dim });
                  marker.clearVelocity();
                } catch {
                }
              }
            }
          }
        }
      }
      const shortDimId = dimId.replace(/^minecraft:/, "");
      for (const wp of waypointCache) {
        if (wp.source === "death") continue;
        if (wp.dim !== shortDimId && wp.dim !== dimId) continue;
        const key = getWaypointKey(wp);
        if (!spawnedKeysInDim.has(key)) {
          spawnWaypointMarker(dim, wp);
        }
      }
    } catch {
    }
  }
}
function correctWaypointMarkerPositions() {
  if (waypointCache.length === 0) return;
  const loweredKeys = getLoweredWaypointKeys();
  const waypointsByKey = /* @__PURE__ */ new Map();
  for (const wp of waypointCache) {
    waypointsByKey.set(getWaypointKey(wp), wp);
  }
  const dimensionIds = [
    "minecraft:overworld",
    "minecraft:nether",
    "minecraft:the_end"
  ];
  for (const dimId of dimensionIds) {
    const dim = resolveDimension(dimId);
    if (!dim) continue;
    try {
      const markers = dim.getEntities({
        type: WAYPOINT_MARKER_TYPE
      });
      for (const marker of markers) {
        if (!marker.isValid) continue;
        const tags = marker.getTags();
        const idTag = tags.find((t) => t.startsWith("wp_id:"));
        if (!idTag) continue;
        const key = idTag.replace(/^wp_id:/, "");
        const wp = waypointsByKey.get(key);
        if (!wp) continue;
        const isLowered = loweredKeys.has(key);
        const targetY = isLowered ? wp.pos.y - 1 : wp.pos.y;
        const targetPos = {
          x: wp.pos.x,
          y: targetY,
          z: wp.pos.z
        };
        const loc = marker.location;
        const dx = loc.x - targetPos.x;
        const dy = loc.y - targetPos.y;
        const dz = loc.z - targetPos.z;
        if (dx * dx + dy * dy + dz * dz > 25e-4) {
          try {
            marker.teleport(targetPos, { dimension: dim });
            marker.clearVelocity();
          } catch {
          }
        }
      }
    } catch {
    }
  }
}

// src/waypoint/virtual-nav.ts
var SPHERE_RADIUS = 30;
var PRE_STEP_DISTANCE = 50;
var ZOOM_ANIM_DURATION_TICKS = 10;
var PIN_TOGGLE_COOLDOWN_TICKS = 15;
var REMOTE_HIDE_DOUBLE_CLICK_TICKS = 15;
var COS_15_DEG = Math.cos(15 * Math.PI / 180);
var playerVirtualNavMap = /* @__PURE__ */ new Map();
var playerFocusedWaypointMap = /* @__PURE__ */ new Map();
var playerHiddenWaypointsMap = /* @__PURE__ */ new Map();
function isWaypointHiddenForPlayer(player, wpKey) {
  const hiddenSet = playerHiddenWaypointsMap.get(player.id);
  if (!hiddenSet) return false;
  return hiddenSet.has(wpKey);
}
function setWaypointHiddenForPlayer(player, wpKey, hidden) {
  let hiddenSet = playerHiddenWaypointsMap.get(player.id);
  if (!hiddenSet) {
    hiddenSet = /* @__PURE__ */ new Set();
    playerHiddenWaypointsMap.set(player.id, hiddenSet);
  }
  if (hidden) {
    hiddenSet.add(wpKey);
  } else {
    hiddenSet.delete(wpKey);
  }
}
function toggleWaypointHiddenForPlayer(player, wpKey) {
  const currentHidden = isWaypointHiddenForPlayer(player, wpKey);
  const nextHidden = !currentHidden;
  setWaypointHiddenForPlayer(player, wpKey, nextHidden);
  return nextHidden;
}
function getWaypointKey2(wp) {
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
function getOrCreatePlayerVirtualNav(player) {
  let state = playerVirtualNavMap.get(player.id);
  if (!state) {
    const currentTick = system5.currentTick;
    state = {
      targetOffset: { x: 0, y: 0, z: 0 },
      startOffset: { x: 0, y: 0, z: 0 },
      animStartTick: currentTick,
      animDurationTicks: ZOOM_ANIM_DURATION_TICKS,
      lastUseTick: 0,
      wasHoldingCompass: true,
      pinnedWaypointKey: null,
      wasShowingHUD: false,
      unpinNoticeUntilTick: 0,
      lastLeftClickTick: 0,
      lastPinToggleTick: 0,
      noticeText: null,
      noticeUntilTick: 0,
      remoteHideTargetKey: null,
      remoteHideClickTick: 0,
      lastSilkTouchDeleteTick: 0,
      recoveryCompassDeathOnly: false
    };
    playerVirtualNavMap.set(player.id, state);
  }
  return state;
}
function clearPlayerVirtualNav(playerId) {
  playerVirtualNavMap.delete(playerId);
  playerFocusedWaypointMap.delete(playerId);
  playerHiddenWaypointsMap.delete(playerId);
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
    return mainhand?.typeId === "minecraft:compass" || mainhand?.typeId === "minecraft:recovery_compass";
  } catch {
    return false;
  }
}
function isPlayerHoldingRecoveryCompass(player) {
  try {
    const equippable = player.getComponent("minecraft:equippable");
    if (!equippable) return false;
    const mainhand = equippable.getEquipment(EquipmentSlot5.Mainhand);
    return mainhand?.typeId === "minecraft:recovery_compass";
  } catch {
    return false;
  }
}
function hasRecoveryCompassInInventory(player) {
  try {
    if (!player || !player.isValid) return false;
    const invComp = player.getComponent("minecraft:inventory");
    const container = invComp?.container;
    if (container) {
      for (let i = 0; i < container.size; i++) {
        const item = container.getItem(i);
        if (item?.typeId === "minecraft:recovery_compass") {
          return true;
        }
      }
    }
    const equippable = player.getComponent("minecraft:equippable");
    if (equippable) {
      const offhand = equippable.getEquipment(EquipmentSlot5.Offhand);
      if (offhand?.typeId === "minecraft:recovery_compass") {
        return true;
      }
      const mainhand = equippable.getEquipment(EquipmentSlot5.Mainhand);
      if (mainhand?.typeId === "minecraft:recovery_compass") {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}
function isWaypointVisibleToPlayer(player, waypoint, requireCompassCheck = true) {
  if (isWaypointHiddenForPlayer(player, getWaypointKey2(waypoint))) {
    return false;
  }
  if (waypoint.source === "death") {
    if (waypoint.creatorId && waypoint.creatorId !== player.id) {
      return false;
    }
    if (requireCompassCheck && !isPlayerHoldingRecoveryCompass(player)) {
      return false;
    }
  } else {
    if (isPlayerHoldingRecoveryCompass(player)) {
      const state = playerVirtualNavMap.get(player.id);
      if (state?.recoveryCompassDeathOnly) {
        return false;
      }
    }
    if (requireCompassCheck && !isPlayerHoldingCompass(player)) {
      return false;
    }
  }
  return true;
}
function getFocusedWaypoint(player) {
  return playerFocusedWaypointMap.get(player.id) ?? null;
}
function getCurrentVirtualOffset(player) {
  const state = playerVirtualNavMap.get(player.id);
  if (!state) return { x: 0, y: 0, z: 0 };
  const currentTick = system5.currentTick;
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
function getPlayerCameraLocation(player) {
  const headLoc = player.getHeadLocation();
  const eyeHeight = player.isSneaking ? 1.27 : 1.62;
  return {
    x: headLoc.x,
    y: player.location.y + eyeHeight,
    z: headLoc.z
  };
}
function getVirtualHeadLocation(player) {
  const camLoc = getPlayerCameraLocation(player);
  const offset = getCurrentVirtualOffset(player);
  return {
    x: camLoc.x + offset.x,
    y: camLoc.y + offset.y,
    z: camLoc.z + offset.z
  };
}
function getVirtualCameraLocation(player) {
  return getVirtualHeadLocation(player);
}
function findRayClosestWaypoint(origin, direction, dimensionId, player) {
  let closest = null;
  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;
    if (player && !isWaypointVisibleToPlayer(player, wp, true)) {
      continue;
    }
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
function getNearbyToggleableWaypoint(player, headLoc, viewDir) {
  const currentDim = player.dimension.id.replace(/^minecraft:/, "");
  let closeTargetWp = null;
  let closestDist = 999;
  const COS_30_DEG = Math.cos(30 * Math.PI / 180);
  for (const wp of waypointCache) {
    const wpDim = wp.dim.replace(/^minecraft:/, "");
    if (wpDim !== currentDim) continue;
    if (wp.source === "death") {
      if (wp.creatorId !== player.id || !isPlayerHoldingRecoveryCompass(player)) {
        continue;
      }
    } else {
      if (isPlayerHoldingRecoveryCompass(player) && playerVirtualNavMap.get(player.id)?.recoveryCompassDeathOnly) {
        continue;
      }
    }
    const dx = wp.pos.x - headLoc.x;
    const dy = wp.pos.y - headLoc.y;
    const dz = wp.pos.z - headLoc.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist <= WAYPOINT_PROXIMITY_RANGE && dist > 0.01) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const dirZ = dz / dist;
      const dot = viewDir.x * dirX + viewDir.y * dirY + viewDir.z * dirZ;
      if (dot >= COS_30_DEG && dist < closestDist) {
        closestDist = dist;
        closeTargetWp = wp;
      }
    }
  }
  if (closeTargetWp) {
    return { waypoint: closeTargetWp, dist: closestDist };
  }
  return null;
}
function checkAndAutoDeleteDeathWaypoint(player) {
  if (!player || !player.isValid) return false;
  const currentDim = player.dimension.id.replace(/^minecraft:/, "");
  const camLoc = getPlayerCameraLocation(player);
  const viewDir = normalize(player.getViewDirection());
  const COS_30_DEG = Math.cos(30 * Math.PI / 180);
  for (const wp of waypointCache) {
    if (wp.source !== "death") continue;
    if (wp.creatorId !== player.id) continue;
    const wpDim = wp.dim.replace(/^minecraft:/, "");
    if (wpDim !== currentDim) continue;
    const dx = wp.pos.x - camLoc.x;
    const dy = wp.pos.y - camLoc.y;
    const dz = wp.pos.z - camLoc.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist <= WAYPOINT_PROXIMITY_RANGE && dist > 0.01) {
      const dirX = dx / dist;
      const dirY = dy / dist;
      const dirZ = dz / dist;
      const dot = viewDir.x * dirX + viewDir.y * dirY + viewDir.z * dirZ;
      if (dot >= COS_30_DEG) {
        const key = getWaypointKey2(wp);
        deleteWaypoint(player.dimension, wp.pos);
        removeWaypointMarker(player.dimension, key, wp.pos);
        const state = getPlayerVirtualNav(player);
        if (state && state.pinnedWaypointKey === key) {
          state.pinnedWaypointKey = null;
        }
        const displayName = getWaypointDisplayName(wp);
        try {
          player.sendMessage(
            `\xA7a[Waypoint] ${displayName} \u306B\u5230\u9054\u3057\u305F\u305F\u3081\u3001\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F`
          );
          if (hasRecoveryCompassInInventory(player)) {
            player.onScreenDisplay.setActionBar(
              `\xA7a[Waypoint] ${displayName} \u306B\u5230\u9054\u3057\u305F\u305F\u3081\u3001\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u3092\u524A\u9664\u3057\u307E\u3057\u305F`
            );
            player.playSound("random.orb", { pitch: 1.2, volume: 1 });
          }
        } catch {
        }
        return true;
      }
    }
  }
  return false;
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
function isPlayerZoomed(player) {
  const state = playerVirtualNavMap.get(player.id);
  if (!state) return false;
  return Math.abs(state.targetOffset.x) > 0.01 || Math.abs(state.targetOffset.y) > 0.01 || Math.abs(state.targetOffset.z) > 0.01;
}
function formatWaypointElapsedTime(createdAt) {
  if (!createdAt) return "0\u5206";
  const createdMs = new Date(createdAt).getTime();
  if (isNaN(createdMs)) return "0\u5206";
  const diffMs = Math.max(0, Date.now() - createdMs);
  const diffMinutes = Math.floor(diffMs / (60 * 1e3));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1e3));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1e3));
  if (diffMinutes < 60) {
    return `${diffMinutes}\u5206`;
  } else if (diffHours <= 72) {
    return `${diffHours}\u6642\u9593`;
  } else {
    return `${diffDays}\u65E5`;
  }
}
function formatWaypointHUDText(player, waypoint, actionTag = "", isZoomed) {
  const zoomed = isZoomed !== void 0 ? isZoomed : isPlayerZoomed(player);
  const zoomPrefix = zoomed ? "\xA77\u30BA\u30FC\u30E0\u4E2D / " : "";
  const headLoc = player.getHeadLocation();
  const dx = waypoint.pos.x - headLoc.x;
  const dy = waypoint.pos.y - headLoc.y;
  const dz = waypoint.pos.z - headLoc.z;
  const dist = Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
  const displayName = getWaypointDisplayName(waypoint);
  const arrow = getRelative8DirectionArrow(player, waypoint.pos);
  const isDeathShiftWithRecovery = waypoint.source === "death" && player.isSneaking && isPlayerHoldingRecoveryCompass(player);
  const timePart = isDeathShiftWithRecovery ? `\xA77${formatWaypointElapsedTime(waypoint.createdAt)}\u524D ` : "";
  const tagPart = actionTag ? `${actionTag} ` : "";
  return `${zoomPrefix}${tagPart}\xA7e${displayName} ${timePart}\xA7f${dist}m \xA7b${arrow}`;
}
function showWaypointOperationNotice(player, waypoint, actionTag, durationTicks = 15) {
  const state = getOrCreatePlayerVirtualNav(player);
  const currentTick = system5.currentTick;
  const text = formatWaypointHUDText(player, waypoint, actionTag);
  state.noticeText = text;
  state.noticeUntilTick = currentTick + durationTicks;
  state.wasShowingHUD = true;
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {
  }
}
function findTargetWaypointSphereFromPreStep(origin50, direction, dimensionId, radius, player) {
  let bestHit = null;
  const r2 = radius * radius;
  for (const wp of waypointCache) {
    const wpDim = wp.dim.includes(":") ? wp.dim : `minecraft:${wp.dim}`;
    if (wpDim !== dimensionId) continue;
    if (player && !isWaypointVisibleToPlayer(player, wp, true)) {
      continue;
    }
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
function handleCompassVirtualNav(player, itemStack, cancelCallback) {
  if (!(player instanceof Player6) || !player.isValid) return;
  if (!itemStack || itemStack.typeId !== "minecraft:compass" && itemStack.typeId !== "minecraft:recovery_compass") {
    return;
  }
  const currentTick = system5.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);
  if (currentTick - state.lastUseTick < 5) {
    cancelCallback?.();
    return;
  }
  state.lastUseTick = currentTick;
  cancelCallback?.();
  const camLoc = getPlayerCameraLocation(player);
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead = {
    x: camLoc.x + currentOffset.x,
    y: camLoc.y + currentOffset.y,
    z: camLoc.z + currentOffset.z
  };
  const nearbyTarget = getNearbyToggleableWaypoint(player, camLoc, viewDir);
  if (nearbyTarget) {
    cancelCallback?.();
    if (currentTick - state.lastPinToggleTick < PIN_TOGGLE_COOLDOWN_TICKS) {
      return;
    }
    state.lastPinToggleTick = currentTick;
    const targetWp = nearbyTarget.waypoint;
    const key = getWaypointKey2(targetWp);
    const isHidden = isWaypointHiddenForPlayer(player, key);
    if (isHidden) {
      setWaypointHiddenForPlayer(player, key, false);
      state.pinnedWaypointKey = key;
      showWaypointOperationNotice(player, targetWp, "\xA76[\u56FA\u5B9A]");
      system5.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
          }
        } catch {
        }
      });
    } else if (state.pinnedWaypointKey === key) {
      state.pinnedWaypointKey = null;
      showWaypointOperationNotice(player, targetWp, "\xA77[\u56FA\u5B9A\u89E3\u9664]");
      system5.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1, volume: 0.8 });
          }
        } catch {
        }
      });
    } else {
      state.pinnedWaypointKey = key;
      showWaypointOperationNotice(player, targetWp, "\xA76[\u56FA\u5B9A]");
      system5.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
          }
        } catch {
        }
      });
    }
    return;
  }
  if (player.isSneaking) {
    if (currentTick - state.lastPinToggleTick < PIN_TOGGLE_COOLDOWN_TICKS) {
      return;
    }
    const closestHit = findRayClosestWaypoint(
      virtHead,
      viewDir,
      player.dimension.id,
      player
    );
    if (closestHit) {
      state.lastPinToggleTick = currentTick;
      const key = getWaypointKey2(closestHit.waypoint);
      const hitDisplayName = getWaypointDisplayName(closestHit.waypoint);
      if (state.pinnedWaypointKey === key) {
        state.pinnedWaypointKey = null;
        showWaypointOperationNotice(
          player,
          closestHit.waypoint,
          "\xA77[\u56FA\u5B9A\u89E3\u9664]"
        );
        system5.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.break", { pitch: 1, volume: 0.8 });
            }
          } catch {
          }
        });
      } else {
        state.pinnedWaypointKey = key;
        showWaypointOperationNotice(player, closestHit.waypoint, "\xA76[\u56FA\u5B9A]");
        system5.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
            }
          } catch {
          }
        });
      }
    }
    return;
  }
  const baseOffset = { ...state.targetOffset };
  const origin = {
    x: camLoc.x + baseOffset.x,
    y: camLoc.y + baseOffset.y,
    z: camLoc.z + baseOffset.z
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
    SPHERE_RADIUS,
    player
  );
  let totalStep;
  let targetName = null;
  if (hit) {
    totalStep = PRE_STEP_DISTANCE + hit.additionalDistance;
    targetName = getWaypointDisplayName(hit.waypoint);
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
function handleCompassLeftClick(player, itemStack) {
  if (!(player instanceof Player6) || !player.isValid) return;
  if (!itemStack || itemStack.typeId !== "minecraft:compass" && itemStack.typeId !== "minecraft:recovery_compass") {
    return;
  }
  const isRecoveryCompass = itemStack.typeId === "minecraft:recovery_compass";
  if (!player.isSneaking) {
    if (!isRecoveryCompass) {
      return;
    }
    const currentTick2 = system5.currentTick;
    const state2 = getOrCreatePlayerVirtualNav(player);
    if (currentTick2 - state2.lastLeftClickTick < 5) {
      return;
    }
    state2.lastLeftClickTick = currentTick2;
    state2.recoveryCompassDeathOnly = !state2.recoveryCompassDeathOnly;
    const isDeathOnly = state2.recoveryCompassDeathOnly;
    const modeText = isDeathOnly ? "\xA7c[Recovery Compass] \u6B7B\u4EA1\u5730\u70B9\u306E\u307F\u8868\u793A" : "\xA7a[Recovery Compass] \u3059\u3079\u3066\u306E\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u3092\u8868\u793A";
    state2.noticeText = modeText;
    state2.noticeUntilTick = currentTick2 + 20;
    state2.wasShowingHUD = true;
    try {
      player.onScreenDisplay.setActionBar(modeText);
    } catch {
    }
    system5.run(() => {
      try {
        if (player && player.isValid) {
          if (isDeathOnly) {
            player.playSound("random.orb", { pitch: 1.5, volume: 1 });
          } else {
            player.playSound("random.orb", { pitch: 1, volume: 1 });
          }
        }
      } catch {
      }
    });
    return;
  }
  const currentTick = system5.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);
  if (currentTick - state.lastLeftClickTick < 2) {
    return;
  }
  state.lastLeftClickTick = currentTick;
  const camLoc = getPlayerCameraLocation(player);
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead = {
    x: camLoc.x + currentOffset.x,
    y: camLoc.y + currentOffset.y,
    z: camLoc.z + currentOffset.z
  };
  const isZoomed = Math.abs(currentOffset.x) > 0.01 || Math.abs(currentOffset.y) > 0.01 || Math.abs(currentOffset.z) > 0.01 || Math.abs(state.targetOffset.x) > 0.01 || Math.abs(state.targetOffset.y) > 0.01 || Math.abs(state.targetOffset.z) > 0.01;
  if (!isZoomed) {
    const nearbyTarget = getNearbyToggleableWaypoint(player, camLoc, viewDir);
    if (nearbyTarget) {
      state.remoteHideTargetKey = null;
      state.remoteHideClickTick = 0;
      const { waypoint: closeTargetWp } = nearbyTarget;
      const wpKey2 = getWaypointKey2(closeTargetWp);
      const isNowHidden = toggleWaypointHiddenForPlayer(player, wpKey2);
      if (isNowHidden && state.pinnedWaypointKey === wpKey2) {
        state.pinnedWaypointKey = null;
      }
      if (isNowHidden) {
        showWaypointOperationNotice(player, closeTargetWp, "\xA77[\u975E\u8868\u793A]");
        system5.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.break", { pitch: 1, volume: 0.8 });
            }
          } catch {
          }
        });
      } else {
        showWaypointOperationNotice(player, closeTargetWp, "\xA7a[\u8868\u793A]");
        system5.run(() => {
          try {
            if (player && player.isValid) {
              player.playSound("random.orb", { pitch: 1.4, volume: 0.9 });
            }
          } catch {
          }
        });
      }
      return;
    }
  }
  const closestHit = findRayClosestWaypoint(
    virtHead,
    viewDir,
    player.dimension.id,
    player
  );
  if (!closestHit) {
    state.remoteHideTargetKey = null;
    state.remoteHideClickTick = 0;
    return;
  }
  const targetWp = closestHit.waypoint;
  const wpKey = getWaypointKey2(targetWp);
  if (state.remoteHideTargetKey === wpKey && currentTick - state.remoteHideClickTick <= REMOTE_HIDE_DOUBLE_CLICK_TICKS) {
    state.remoteHideTargetKey = null;
    state.remoteHideClickTick = 0;
    if (targetWp.source === "death") {
      deleteWaypoint(player.dimension, targetWp.pos);
      removeWaypointMarker(player.dimension, wpKey, targetWp.pos);
      if (state.pinnedWaypointKey === wpKey) {
        state.pinnedWaypointKey = null;
      }
      const displayName = getWaypointDisplayName(targetWp);
      showWaypointOperationNotice(player, targetWp, "\xA7c[\u524A\u9664 \u25A0\u25A0]");
      try {
        player.sendMessage(`\xA7c[Waypoint] ${displayName} \u3092\u524A\u9664\u3057\u307E\u3057\u305F`);
      } catch {
      }
      system5.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1.2, volume: 1 });
          }
        } catch {
        }
      });
    } else {
      setWaypointHiddenForPlayer(player, wpKey, true);
      if (state.pinnedWaypointKey === wpKey) {
        state.pinnedWaypointKey = null;
      }
      showWaypointOperationNotice(player, targetWp, "\xA7c[\u975E\u8868\u793A \u25A0\u25A0]");
      system5.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.break", { pitch: 1, volume: 0.8 });
          }
        } catch {
        }
      });
    }
  } else {
    state.remoteHideTargetKey = wpKey;
    state.remoteHideClickTick = currentTick;
    const noticeTag = targetWp.source === "death" ? "\xA7c[\u524A\u9664 \u25A0\u25A1]" : "\xA7c[\u975E\u8868\u793A \u25A0\u25A1]";
    showWaypointOperationNotice(player, targetWp, noticeTag);
    system5.run(() => {
      try {
        if (player && player.isValid) {
          player.playSound("random.orb", { pitch: 1.2, volume: 0.8 });
        }
      } catch {
      }
    });
  }
}
function updatePlayerVirtualNavHUD(player) {
  checkAndAutoDeleteDeathWaypoint(player);
  const currentTick = system5.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);
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
  const camLoc = getPlayerCameraLocation(player);
  const viewDir = normalize(player.getViewDirection());
  const currentOffset = getCurrentVirtualOffset(player);
  const virtHead = {
    x: camLoc.x + currentOffset.x,
    y: camLoc.y + currentOffset.y,
    z: camLoc.z + currentOffset.z
  };
  let activeWaypoint = null;
  let isPinnedActive = false;
  let pinnedWp = null;
  if (state.pinnedWaypointKey) {
    for (const wp of waypointCache) {
      if (getWaypointKey2(wp) === state.pinnedWaypointKey) {
        pinnedWp = wp;
        break;
      }
    }
    if (!pinnedWp || isWaypointHiddenForPlayer(player, state.pinnedWaypointKey)) {
      state.pinnedWaypointKey = null;
      pinnedWp = null;
    } else if (pinnedWp.source === "death") {
      if (pinnedWp.creatorId && pinnedWp.creatorId !== player.id) {
        state.pinnedWaypointKey = null;
        pinnedWp = null;
      } else if (!hasRecoveryCompassInInventory(player)) {
        pinnedWp = null;
      }
    }
  }
  if (isHolding) {
    const nearbyTarget = getNearbyToggleableWaypoint(player, camLoc, viewDir);
    if (nearbyTarget) {
      activeWaypoint = nearbyTarget.waypoint;
      isPinnedActive = pinnedWp !== null && getWaypointKey2(activeWaypoint) === state.pinnedWaypointKey;
    } else if (player.isSneaking) {
      const closestHit = findRayClosestWaypoint(
        virtHead,
        viewDir,
        player.dimension.id,
        player
      );
      if (closestHit) {
        activeWaypoint = closestHit.waypoint;
        isPinnedActive = pinnedWp !== null && getWaypointKey2(activeWaypoint) === state.pinnedWaypointKey;
      } else if (pinnedWp) {
        activeWaypoint = pinnedWp;
        isPinnedActive = true;
      }
    } else if (pinnedWp) {
      activeWaypoint = pinnedWp;
      isPinnedActive = true;
    }
  } else if (pinnedWp) {
    activeWaypoint = pinnedWp;
    isPinnedActive = true;
  }
  playerFocusedWaypointMap.set(player.id, activeWaypoint);
  const isZoomed = isHolding && (Math.abs(currentOffset.x) > 0.01 || Math.abs(currentOffset.y) > 0.01 || Math.abs(currentOffset.z) > 0.01 || Math.abs(state.targetOffset.x) > 0.01 || Math.abs(state.targetOffset.y) > 0.01 || Math.abs(state.targetOffset.z) > 0.01);
  const zoomPrefix = isZoomed ? "\xA77\u30BA\u30FC\u30E0\u4E2D / " : "";
  if (currentTick < state.noticeUntilTick && state.noticeText) {
    try {
      player.onScreenDisplay.setActionBar(state.noticeText);
    } catch {
    }
    state.wasShowingHUD = true;
  } else if (activeWaypoint) {
    const actionTag = isPinnedActive && isHolding ? "\xA76[\u56FA\u5B9A]" : "";
    const text = formatWaypointHUDText(
      player,
      activeWaypoint,
      actionTag,
      isZoomed
    );
    try {
      player.onScreenDisplay.setActionBar(text);
      state.wasShowingHUD = true;
    } catch {
    }
  } else if (isZoomed) {
    try {
      player.onScreenDisplay.setActionBar("\xA77\u30BA\u30FC\u30E0\u4E2D");
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
function hasSilkTouchEnchantment(itemStack) {
  if (!itemStack) return false;
  try {
    const enchantable = itemStack.getComponent("minecraft:enchantable");
    if (!enchantable) return false;
    return enchantable.hasEnchantment("silk_touch");
  } catch {
    return false;
  }
}
function handleSilkTouchWaypointDelete(player, itemStack, cancelCallback) {
  if (!(player instanceof Player6) || !player.isValid) return false;
  if (!hasSilkTouchEnchantment(itemStack)) return false;
  const currentTick = system5.currentTick;
  const state = getOrCreatePlayerVirtualNav(player);
  if (currentTick - state.lastSilkTouchDeleteTick < 10) {
    cancelCallback?.();
    return true;
  }
  const headLoc = player.getHeadLocation();
  const viewDir = normalize(player.getViewDirection());
  const nearbyTarget = getNearbyToggleableWaypoint(player, headLoc, viewDir);
  if (!nearbyTarget) {
    return false;
  }
  cancelCallback?.();
  state.lastSilkTouchDeleteTick = currentTick;
  const targetWp = nearbyTarget.waypoint;
  const wpPos = { ...targetWp.pos };
  const dim = player.dimension;
  const deletedKey = getWaypointKey2(targetWp);
  deleteWaypoint(dim, targetWp.pos);
  if (state.pinnedWaypointKey === deletedKey) {
    state.pinnedWaypointKey = null;
  }
  removeWaypointMarker(dim, deletedKey, targetWp.pos);
  const deletedDisplayName = getWaypointDisplayName(targetWp);
  try {
    player.sendMessage(`\xA7c[Waypoint] \xA7f${deletedDisplayName} \xA7c\u3092\u524A\u9664\u3057\u307E\u3057\u305F`);
    player.onScreenDisplay.setActionBar(
      `\xA7c[Waypoint] \xA7f${deletedDisplayName} \xA7c\u3092\u524A\u9664\u3057\u307E\u3057\u305F`
    );
    if (targetWp.source !== "death") {
      world6.sendMessage(
        `\xA7c[Waypoint] \xA7f${deletedDisplayName} \xA7c\u304C ${player.name} \u306B\u3088\u3063\u3066\u524A\u9664\u3055\u308C\u307E\u3057\u305F`
      );
    }
  } catch {
  }
  system5.run(() => {
    try {
      if (player && player.isValid) {
        player.playSound("random.break", { pitch: 1.2, volume: 1 });
      }
      dim.playSound("random.break", wpPos, { pitch: 1.2, volume: 1 });
    } catch {
    }
  });
  return true;
}

// src/waypoint/waypoint-utils.ts
function spawnWaypointParticle(options) {
  const { dimension, location, color, size, durationTicks } = options;
  if (!location) return;
  try {
    const dim = typeof dimension === "string" ? world7.getDimension(
      dimension.includes(":") ? dimension : `minecraft:${dimension}`
    ) : dimension;
    if (!dim) return;
    const lifetimeSeconds = Math.max(0.05, durationTicks / 20);
    const safeColor = color ?? { r: 1, g: 1, b: 1 };
    const molang = new MolangVariableMap();
    molang.setFloat("variable.marker_size", Math.max(0.01, size));
    molang.setFloat("variable.color.r", safeColor.r);
    molang.setFloat("variable.color.g", safeColor.g);
    molang.setFloat("variable.color.b", safeColor.b);
    molang.setFloat("variable.color_r", safeColor.r);
    molang.setFloat("variable.color_g", safeColor.g);
    molang.setFloat("variable.color_b", safeColor.b);
    molang.setFloat("variable.lifetime", lifetimeSeconds);
    molang.setColorRGB("variable.color", {
      red: safeColor.r,
      green: safeColor.g,
      blue: safeColor.b
    });
    dim.spawnParticle("mining_utility:waypoint_particle", location, molang);
  } catch (e) {
  }
}
function spawnWaypointBodyParticleForPlayer(options) {
  const { player, location, color, size, durationTicks, dimension } = options;
  if (!player || !player.isValid || !location) return;
  if (dimension) {
    const dimId = typeof dimension === "string" ? dimension.includes(":") ? dimension : `minecraft:${dimension}` : dimension.id;
    if (player.dimension.id !== dimId) return;
  }
  const lifetimeSeconds = Math.max(0.05, durationTicks / 20);
  const safeColor = color ?? { r: 1, g: 1, b: 1 };
  const molang = new MolangVariableMap();
  molang.setFloat("variable.marker_size", Math.max(0.01, size));
  molang.setFloat("variable.color.r", safeColor.r);
  molang.setFloat("variable.color.g", safeColor.g);
  molang.setFloat("variable.color.b", safeColor.b);
  molang.setFloat("variable.color_r", safeColor.r);
  molang.setFloat("variable.color_g", safeColor.g);
  molang.setFloat("variable.color_b", safeColor.b);
  molang.setFloat("variable.lifetime", lifetimeSeconds);
  molang.setColorRGB("variable.color", {
    red: safeColor.r,
    green: safeColor.g,
    blue: safeColor.b
  });
  try {
    player.spawnParticle("mining_utility:waypoint_particle", location, molang);
  } catch (e) {
  }
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
  if (!player || !player.isValid) return;
  if (!isPlayerHoldingCompass(player)) return;
  const camLoc = getPlayerCameraLocation(player);
  const viewDir = player.getViewDirection();
  if (getNearbyToggleableWaypoint(player, camLoc, viewDir)) {
    return;
  }
  const dimension = player.dimension;
  const offset = getCurrentVirtualOffset(player);
  const isVirtual = Math.abs(offset.x) > 0.05 || Math.abs(offset.y) > 0.05 || Math.abs(offset.z) > 0.05;
  const focusedWp = getFocusedWaypoint(player);
  const focusedKey = focusedWp ? getWaypointKey2(focusedWp) : null;
  const pinnedKey = getPinnedWaypointKey(player);
  let isPinnedVisible = false;
  if (pinnedKey) {
    const pinnedWp = waypointCache.find(
      (wp) => getWaypointKey2(wp) === pinnedKey
    );
    if (pinnedWp && isWaypointVisibleToPlayer(player, pinnedWp, true)) {
      isPinnedVisible = true;
    }
  }
  const isGrayMode = isPinnedVisible && !player.isSneaking;
  const originX = camLoc.x + offset.x;
  const originY = camLoc.y + offset.y;
  const originZ = camLoc.z + offset.z;
  for (let waypoint of waypointCache) {
    try {
      const waypointDimension = waypoint.dim.includes(":") ? waypoint.dim : `minecraft:${waypoint.dim}`;
      if (waypointDimension !== dimension.id) continue;
      const wpKey = getWaypointKey2(waypoint);
      if (!isWaypointVisibleToPlayer(player, waypoint, true)) continue;
      const targetX = waypoint.pos.x;
      const targetY = waypoint.pos.y;
      const targetZ = waypoint.pos.z;
      const dx = targetX - originX;
      const dy = targetY - originY;
      const dz = targetZ - originZ;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (!isVirtual && dist < WAYPOINT_PROXIMITY_RANGE) continue;
      const safeDist = Math.max(0.1, dist);
      const projDist = HUD_MARKER_CONFIG.projectionDistance;
      const projX = camLoc.x + dx / safeDist * projDist;
      const projY = camLoc.y + dy / safeDist * projDist;
      const projZ = camLoc.z + dz / safeDist * projDist;
      const isFocused = focusedKey !== null && wpKey === focusedKey;
      const sizeMultiplier = isFocused ? HUD_MARKER_CONFIG.focusZoom : 1;
      const apparentSize = HUD_MARKER_CONFIG.baseSize * (projDist / safeDist);
      const finalSize = Math.min(
        HUD_MARKER_CONFIG.maxSize,
        Math.max(HUD_MARKER_CONFIG.minSize, apparentSize) * sizeMultiplier
      );
      const isPinned = pinnedKey !== null && wpKey === pinnedKey;
      const color = isGrayMode && !isPinned ? HUD_GRAY_COLOR : getWaypointRGB(waypoint);
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
  loadWaypoints();
  system6.runTimeout(() => {
    try {
      syncWaypointMarkers();
    } catch {
    }
  }, 40);
  system6.runInterval(() => {
    try {
      syncWaypointMarkers();
    } catch {
    }
  }, 100);
  system6.runInterval(() => {
    for (let player of world8.getAllPlayers()) {
      if (!player || !player.isValid) continue;
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
  world8.beforeEvents.itemUse.subscribe((event) => {
    const { source: player, itemStack } = event;
    if (!itemStack) return;
    if (itemStack.typeId === "minecraft:compass" || itemStack.typeId === "minecraft:recovery_compass") {
      handleCompassVirtualNav(player, itemStack, () => {
        event.cancel = true;
      });
      return;
    }
    if (handleSilkTouchWaypointDelete(player, itemStack, () => {
      event.cancel = true;
    })) {
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
  world8.beforeEvents.playerInteractWithBlock.subscribe((event) => {
    const { player, itemStack } = event;
    if (!itemStack) return;
    if (itemStack.typeId === "minecraft:compass" || itemStack.typeId === "minecraft:recovery_compass") {
      handleCompassVirtualNav(player, itemStack, () => {
        event.cancel = true;
      });
      return;
    }
    if (handleSilkTouchWaypointDelete(player, itemStack, () => {
      event.cancel = true;
    })) {
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
  try {
    const afterEvents = world8.afterEvents;
    if (afterEvents && typeof afterEvents.playerSwingStart?.subscribe === "function") {
      afterEvents.playerSwingStart.subscribe((event) => {
        try {
          const { player, heldItemStack } = event;
          if (!heldItemStack || heldItemStack.typeId !== "minecraft:compass" && heldItemStack.typeId !== "minecraft:recovery_compass") {
            return;
          }
          handleCompassLeftClick(player, heldItemStack);
        } catch (err) {
          console.warn("[Waypoints] playerSwingStart \u30CF\u30F3\u30C9\u30E9\u30FC\u5185\u30A8\u30E9\u30FC:", err);
        }
      });
    } else {
      console.warn(
        "[Waypoints] \u73FE\u5728\u306E\u74B0\u5883\u3067\u306F playerSwingStart \u306F\u672A\u30B5\u30DD\u30FC\u30C8\u3067\u3059\u3002"
      );
    }
  } catch (e) {
    console.warn(
      "[Waypoints] playerSwingStart \u306E\u767B\u9332\u306B\u5931\u6557\u3057\u307E\u3057\u305F\uFF08\u30B9\u30AD\u30C3\u30D7\uFF09:",
      e
    );
  }
  try {
    const afterEvents = world8.afterEvents;
    if (afterEvents && typeof afterEvents.playerStartBreakingBlock?.subscribe === "function") {
      afterEvents.playerStartBreakingBlock.subscribe((event) => {
        try {
          const { player, itemStack } = event;
          if (!itemStack || itemStack.typeId !== "minecraft:compass" && itemStack.typeId !== "minecraft:recovery_compass") {
            return;
          }
          handleCompassLeftClick(player, itemStack);
        } catch {
        }
      });
    }
  } catch {
  }
  world8.afterEvents.playerPlaceBlock.subscribe((event) => {
    const { block, player } = event;
    if (block.typeId === "minecraft:standing_banner" || block.typeId === "minecraft:wall_banner") {
      const blockPos = Vector3Utils.floor(block.location);
      const waypointPos = Vector3Utils.add(blockPos, {
        x: 0.5,
        y: 0.5,
        z: 0.5
      });
      if (hasWaypointAt(player.dimension, waypointPos)) {
        return;
      }
      const rawName = lastPlacedBannerName.get(player.id);
      const placedName = rawName && rawName.trim() !== "" ? rawName : null;
      if (placedName === null && !player.isSneaking) {
        return;
      }
      const placedColor = playerBannerColorCache.get(player.id) ?? "white";
      const waypoint = addWaypoint(
        player.dimension,
        waypointPos,
        placedColor,
        placedName,
        player.id
      );
      spawnWaypointMarker(player.dimension, waypoint);
      const displayName = getWaypointDisplayName(waypoint);
      try {
        world8.sendMessage(
          `\xA7a[Waypoint] \xA7f${player.name} \xA7a\u304C\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8 \xA7f${displayName} \xA7a\u3092\u8A2D\u7F6E\u3057\u307E\u3057\u305F`
        );
      } catch {
      }
      const dim = player.dimension;
      const soundPos = { ...waypointPos };
      system6.run(() => {
        try {
          if (player && player.isValid) {
            player.playSound("random.orb", { pitch: 1.2, volume: 1 });
          }
          dim.playSound("random.orb", soundPos, { pitch: 1.2, volume: 1 });
        } catch {
        }
      });
    } else {
      const bPos = Vector3Utils.floor(block.location);
      const existingWp = getWaypointAt(player.dimension, bPos);
      if (existingWp) {
        spawnWaypointMarker(player.dimension, existingWp);
      }
    }
  });
  world8.afterEvents.playerBreakBlock.subscribe((event) => {
    const { block, brokenBlockPermutation, player, itemStackBeforeBreak } = event;
    const blockTypeId = brokenBlockPermutation.type.id;
    if (blockTypeId === "minecraft:standing_banner" || blockTypeId === "minecraft:wall_banner") {
      const blockPos = Vector3Utils.floor(block.location);
      const waypoint = getWaypointAt(player.dimension, blockPos);
      if (waypoint) {
        const usedItem = itemStackBeforeBreak ?? player.getComponent("minecraft:equippable")?.getEquipment(EquipmentSlot6.Mainhand);
        if (hasSilkTouchEnchantment(usedItem)) {
          return;
        }
        deleteWaypoint(player.dimension, waypoint.pos);
        const key = getWaypointKey(waypoint);
        removeWaypointMarker(player.dimension, key, waypoint.pos);
        const displayName = getWaypointDisplayName(waypoint);
        try {
          player.sendMessage(`\xA7c[Waypoint] \xA7f${displayName} \xA7c\u3092\u524A\u9664\u3057\u307E\u3057\u305F`);
          player.playSound("random.break", { pitch: 1.2, volume: 1 });
          world8.sendMessage(
            `\xA7c[Waypoint] \xA7f${displayName} \xA7c\u304C ${player.name} \u306B\u3088\u3063\u3066\u524A\u9664\u3055\u308C\u307E\u3057\u305F`
          );
        } catch {
        }
      }
    }
  });
  world8.afterEvents.playerLeave.subscribe((event) => {
    try {
      lastPlacedBannerName.delete(event.playerId);
      playerBannerColorCache.delete(event.playerId);
      clearPlayerVirtualNav(event.playerId);
    } catch {
    }
  });
  system6.runInterval(() => {
    try {
      correctWaypointMarkerPositions();
    } catch {
    }
  }, 2);
  system6.runInterval(() => {
    try {
      const players = world8.getAllPlayers();
      if (players.length === 0 || waypointCache.length === 0) return;
      for (let player of players) {
        if (!player || !player.isValid) continue;
        const playerDimId = player.dimension.id;
        const playerPos = player.location;
        for (let waypoint of waypointCache) {
          try {
            const wpDimId = waypoint.dim.includes(":") ? waypoint.dim : `minecraft:${waypoint.dim}`;
            if (playerDimId !== wpDimId) continue;
            const wpKey = getWaypointKey(waypoint);
            if (isWaypointHiddenForPlayer(player, wpKey)) continue;
            if (waypoint.source === "death") {
              if (waypoint.creatorId !== player.id || !hasRecoveryCompassInInventory(player)) {
                continue;
              }
            } else if (isPlayerHoldingRecoveryCompass(player)) {
              const state = getPlayerVirtualNav(player);
              if (state?.recoveryCompassDeathOnly) {
                continue;
              }
            }
            const dx = waypoint.pos.x - playerPos.x;
            const dy = waypoint.pos.y - playerPos.y;
            const dz = waypoint.pos.z - playerPos.z;
            if (dx * dx + dy * dy + dz * dz > 128 * 128) continue;
            const colorRgb = getWaypointRGB(waypoint);
            spawnWaypointBodyParticleForPlayer({
              player,
              location: waypoint.pos,
              color: colorRgb,
              size: 1,
              durationTicks: 11
            });
          } catch {
          }
        }
      }
    } catch {
    }
  }, 10);
  world8.afterEvents.entityDie.subscribe((event) => {
    try {
      const deadEntity = event.deadEntity;
      if (!(deadEntity instanceof Player8)) return;
      const player = deadEntity;
      const dim = player.dimension;
      const minY = dim.heightRange.min;
      const clampedY = Math.max(player.location.y, minY);
      const waypointPos = {
        x: Math.floor(player.location.x) + 0.5,
        y: Math.floor(clampedY) + 0.5,
        z: Math.floor(player.location.z) + 0.5
      };
      let deathCount = 1;
      try {
        const rawCount = player.getDynamicProperty("death_waypoint_count");
        if (typeof rawCount === "number" && Number.isFinite(rawCount) && rawCount >= 0) {
          deathCount = Math.floor(rawCount) + 1;
        }
        player.setDynamicProperty("death_waypoint_count", deathCount);
      } catch {
      }
      const existingDeathWps = waypointCache.filter(
        (wp) => wp.source === "death" && wp.creatorId === player.id
      );
      const MAX_DEATH_WAYPOINTS = 20;
      if (existingDeathWps.length >= MAX_DEATH_WAYPOINTS) {
        existingDeathWps.sort((a, b) => {
          const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tA - tB;
        });
        const toRemoveCount = existingDeathWps.length - MAX_DEATH_WAYPOINTS + 1;
        for (let i = 0; i < toRemoveCount; i++) {
          const oldWp = existingDeathWps[i];
          try {
            const oldDimId = oldWp.dim.includes(":") ? oldWp.dim : `minecraft:${oldWp.dim}`;
            const oldDim = world8.getDimension(oldDimId);
            if (oldDim) {
              deleteWaypoint(oldDim, oldWp.pos);
              const oldKey = getWaypointKey(oldWp);
              removeWaypointMarker(oldDim, oldKey, oldWp.pos);
            }
          } catch {
          }
        }
      }
      deathCount = existingDeathWps.length + 1;
      const waypointName = `\u6B7B\u4EA1\u5730\u70B9${deathCount}`;
      addWaypoint(
        dim,
        waypointPos,
        DEATH_COLOR_NAME,
        waypointName,
        player.id,
        void 0,
        "death"
      );
      try {
        player.sendMessage(
          `\xA7c[Waypoint] ${waypointName} \u306B\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u3092\u767B\u9332\u3057\u307E\u3057\u305F\uFF08\u30EA\u30AB\u30D0\u30EA\u30FC\u30B3\u30F3\u30D1\u30B9\u3067\u78BA\u8A8D\u53EF\u80FD\uFF09`
        );
      } catch {
      }
    } catch (e) {
      console.warn(
        "[Waypoints] \u6B7B\u4EA1\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u751F\u6210\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F:",
        e
      );
    }
  });
  system6.runInterval(() => {
    for (let player of world8.getAllPlayers()) {
      try {
        if (!player || !player.isValid) continue;
        updatePlayerVirtualNavHUD(player);
        displayHUDWaypoints(player);
      } catch {
      }
    }
  }, 1);
}

// src/map.ts
import { world as world9, EquipmentSlot as EquipmentSlot7 } from "@minecraft/server";
var TARGET_MAP_LEVEL = 3;
var MAP_SIZE = 128 * Math.pow(2, TARGET_MAP_LEVEL);
world9.afterEvents.itemUse.subscribe((event) => {
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
system7.run(() => {
  try {
    world10.gameRules.keepInventory = true;
  } catch {
  }
  initWaypoints();
  console.warn(
    "\xA7a[Mining & Utility Addon] \u63A1\u6398\u30FB\u5893\u30FB\u305F\u3044\u307E\u3064\u30FB\u30A6\u30A7\u30A4\u30DD\u30A4\u30F3\u30C8\u6A5F\u80FD\u304C\u6B63\u5E38\u306B\u30ED\u30FC\u30C9\u3055\u308C\u307E\u3057\u305F\u3002"
  );
});
world10.beforeEvents.playerBreakBlock.subscribe((event) => {
  handleGraveBeforeBreak(event);
});
world10.afterEvents.playerBreakBlock.subscribe((event) => {
  oreMassDestruction(event, ORE_BLOCK_IDS);
  treeMassDestruction(event);
});
world10.beforeEvents.itemUse.subscribe((event) => {
  handleSettingsItemUse(event, () => {
    event.cancel = true;
  });
  handleTorchSwap(event.source, () => {
    event.cancel = true;
  });
});
world10.afterEvents.entityDie.subscribe((event) => {
  handleGraveEntityDie(event);
});
world10.beforeEvents.playerInteractWithBlock.subscribe((event) => {
  handleGraveBeforeInteract(event);
});
system7.afterEvents.scriptEventReceive.subscribe((event) => {
  try {
    handleSettingsScriptEvent(event);
  } catch (error) {
    console.error("\u30A4\u30D9\u30F3\u30C8\u51E6\u7406\u30A8\u30E9\u30FC:", error);
  }
});
world10.afterEvents.playerSpawn.subscribe((event) => {
  const player = event.player;
  if (!player) return;
  handleGravePlayerSpawn(player);
  if (event.initialSpawn) {
    system7.run(() => {
      try {
        player.sendMessage(
          `\xA76[Mining & Utility Addon] \xA7a\u30ED\u30FC\u30C9\u5B8C\u4E86
\xA77\u203B \u6728\u306E\u5263 (Wooden Sword) \u3092\u6301\u3063\u3066\u753B\u9762\u9577\u62BC\u3057(\u53F3\u30AF\u30EA\u30C3\u30AF)\u3067\u8A2D\u5B9A\u753B\u9762\u304C\u958B\u304D\u307E\u3059\u3002`
        );
      } catch {
      }
    });
  }
});
export {
  HUD_GRAY_COLOR,
  HUD_MARKER_CONFIG,
  PIN_TOGGLE_COOLDOWN_TICKS,
  PRE_STEP_DISTANCE,
  REMOTE_HIDE_DOUBLE_CLICK_TICKS,
  SPHERE_RADIUS,
  WAYPOINT_MARKER_TAG,
  WAYPOINT_MARKER_TYPE,
  ZOOM_ANIM_DURATION_TICKS,
  checkAndAutoDeleteDeathWaypoint,
  clearPlayerVirtualNav,
  correctWaypointMarkerPositions,
  displayHUDWaypoints,
  findRayClosestWaypoint,
  formatWaypointElapsedTime,
  formatWaypointHUDText,
  getCurrentVirtualOffset,
  getFocusedWaypoint,
  getLoweredWaypointKeys,
  getNearbyToggleableWaypoint,
  getOrCreatePlayerVirtualNav,
  getPinnedWaypointKey,
  getPlayerCameraLocation,
  getPlayerVirtualNav,
  getRelative8DirectionArrow,
  getVirtualCameraLocation,
  getVirtualHeadLocation,
  getWaypointKey2 as getWaypointKey,
  getWaypointMarkerNameTag,
  handleCompassLeftClick,
  handleCompassVirtualNav,
  handleSilkTouchWaypointDelete,
  hasRecoveryCompassInInventory,
  hasSilkTouchEnchantment,
  isPlayerHoldingCompass,
  isPlayerHoldingRecoveryCompass,
  isPlayerZoomed,
  isWaypointHiddenForPlayer,
  isWaypointVisibleToPlayer,
  removeWaypointMarker,
  setWaypointHiddenForPlayer,
  showWaypointOperationNotice,
  spawnWaypointBodyParticleForPlayer,
  spawnWaypointMarker,
  spawnWaypointParticle,
  spawnWaypointParticleForPlayer,
  syncWaypointMarkers,
  toggleWaypointHiddenForPlayer,
  updatePlayerVirtualNavHUD
};
