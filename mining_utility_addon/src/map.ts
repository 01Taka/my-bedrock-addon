import { world, EquipmentSlot, EntityEquippableComponent } from "@minecraft/server";

// ==========================================
// 【設定】対象にしたい地図のレベル (0〜4)
// レベル0: 128 / レベル1: 256 / レベル2: 512 / レベル3: 1024 / レベル4: 2048
// ==========================================
const TARGET_MAP_LEVEL = 3; 

// レベルに応じた1辺のサイズを計算 (128 * 2^level)
const MAP_SIZE = 128 * Math.pow(2, TARGET_MAP_LEVEL);

world.afterEvents.itemUse.subscribe((event) => {
    const player = event.source;
    const item = event.itemStack;

    // スニーク中 かつ 拡張・開いた地図 (minecraft:filled_map) の場合
    if (player.isSneaking && item.typeId === "minecraft:filled_map") {
        const x = player.location.x;
        const z = player.location.z;

        // 方眼計算式 (切り捨て)
        const mx = Math.floor((x + 64) / MAP_SIZE);
        const mz = Math.floor((z + 64) / MAP_SIZE);

        // 装備コンポーネントからメインハンドのアイテムを取得
        const equippable = player.getComponent("minecraft:equippable") as EntityEquippableComponent | undefined;
        if (!equippable) return;

        const mainhandItem = equippable.getEquipment(EquipmentSlot.Mainhand);
        if (mainhandItem && mainhandItem.typeId === "minecraft:filled_map") {
            // 既に識別子が付いている場合は上書きできるよう、末尾の (x, z) を取り除く
            let baseName = mainhandItem.nameTag ?? "地図";
            baseName = baseName.replace(/\s*\([+-]?\d+,\s*[+-]?\d+\)$/, "");

            // 名前の末尾に (mx, mz) を付与
            const newName = `${baseName} (${mx}, ${mz})`;
            mainhandItem.nameTag = newName;

            // アイテムを手に戻す
            equippable.setEquipment(EquipmentSlot.Mainhand, mainhandItem);

            // チャット欄に通知
            player.sendMessage(`§a[地図] 名前を変更しました: §f${newName}`);
        }
    }
});
