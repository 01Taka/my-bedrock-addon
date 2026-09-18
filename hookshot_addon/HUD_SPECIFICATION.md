# フックショット ピルHUD仕様書（アーカイブ・復元用）

本ドキュメントは、かつてフックショットアドオンに実装されていた「アクションバーによるピルHUD表示システム」の仕様およびソースコードの完全な記録です。
後からHUD表示を再度有効化・復元したくなった場合は、本ドキュメントを参照して実装を戻すことができます。

---

## 1. HUDの概要と表示場所

- **表示方式**: Minecraft Bedrock Script API の `player.onScreenDisplay.setActionBar(...)` によるアクションバー表示。
- **表示シンボル**: 3つのピル `(▰▰▰)`
- **表示条件**:
  - メインハンドまたはオフハンドにフックショットを所持している、またはフックが着弾中であること。
  - 所持しておらずフックも刺さっていない場合は、`setActionBar("")` を送信してHUDを非表示（クリア）にする。

---

## 2. 状態別の表示色・UI仕様

### ① 構えている状態（未着弾）
プレイヤーの視線方向（射程120ブロック以内）に着弾可能なブロックまたは大型モブが存在するかを検知し、照準器のように色を変えて通知します。

| 状態 | 表示テキスト | 意味 |
|---|---|---|
| 射程内に対象あり | `§7(▰▰▰)` (明るい灰色) | フックが届く範囲に壁やモブがあり、射出可能 |
| 射程外・対象なし | `§8(▰▰▰)` (暗灰色) | 射程外、または空間が開いていて刺さる場所がない |

### ② 着弾完了・初回巻き取り前（ブレーキ待機状態）
フックが刺さり、まだスニーク（巻き取り）を開始していない状態です。
巻き取りを開始した瞬間に「下方向の落下速度リセット＆衝撃吸収ブレーキ」が発動できる準備状態であることを示します。

- **表示テキスト**: `§6(▰▰▰)` (オレンジ色)

### ③ 巻き取り中（ピルチャージ蓄積状態）
巻き取りを開始すると経過時間（4 ticks = 1ピル）に応じてピルがチャージされていきます。
解除時の小爆発＆上方向ホップインパルスが発動可能かどうかがひと目で分かります。

- **ピルの色（activeColor）**:
  - 空中にいる場合: `§a` (鮮やかな黄緑色 - 空中解除ホップ発動可能)
  - 地面にいる場合: `§2` (暗い緑色 - 着地中のため解除ホップは不発になる状態)
- **空ピルの色（emptyColor）**:
  - `§7` (明るい灰色)

| チャージ数 | 表示フォーマット |
|---|---|
| **0個** | `§7(▰▰▰)` |
| **1個** | `§7(` + activeColor + `▰` + `§7▰▰)` |
| **2個** | `§7(` + activeColor + `▰▰` + `§7▰)` |
| **3個 (MAX)** | `${activeColor}(▰▰▰)` (満タン・解除ホップ準備完了) |

---

## 3. 実装されていたTypeScriptソースコード（復元用）

### ① 必要なキャッシュ・変数の定義
```typescript
/** 前回ピルHUDを表示したプレイヤーIDのセット（非表示時のアクションバー消去用） */
const playersWithPillHud = new Set<string>();

/** 照準判定（未着弾時の空ピル色）のキャッシュ（毎tickレイキャスト負荷軽減用） */
const targetAimCache = new Map<string, { canHit: boolean; lastCheckTick: number }>();
```

### ② HUD更新関数 (`updateManualHookshotHud`)
```typescript
/**
 * アクションバーにピルの蓄積状況を示すテキストなしピルUIを表示
 * （手に持っておらず、フックも刺さっていない場合はHUDをクリア）
 */
export function updateManualHookshotHud(player: Player): void {
  if (!player.isValid) return;

  const shouldShow = isHoldingManualHookshot(player) || playerHooks.has(player.id);

  if (shouldShow) {
    playersWithPillHud.add(player.id);
    const hook = playerHooks.get(player.id);

    // 1. 着弾中で、まだ最初の巻き取りが開始されていない場合:
    //    オレンジ色(§6)で「着弾完了・巻き取り開始時の衝撃吸収ブレーキ待機中」を表示
    if (hook && !hook.hasStartedWinding) {
      player.onScreenDisplay.setActionBar("§6(▰▰▰)");
      return;
    }

    // 2. 巻き取り開始後、または未着弾時（構えている状態）のHUD表示
    const pills = getChargedPillCount(player);
    const maxPills = MANUAL_HOOKSHOT_CONFIG.PILL_MAX_COUNT;
    // 着地中で実際には爆発とインパルスが発生しない場合はグレーっぽい薄緑(§2)、空中で発動可能な場合は鮮やかな緑(§a)
    const activeColor = player.isOnGround ? "§2" : "§a";

    // 射程内で壁または大型モブに着弾可能か判定（未着弾時の空ピル色用）
    // サーバー負荷軽減のため 4 tick (約0.2秒) ごとにキャッシュ更新
    let canHitTarget = false;
    if (!hook) {
      const cached = targetAimCache.get(player.id);
      if (cached && system.currentTick - cached.lastCheckTick < 4) {
        canHitTarget = cached.canHit;
      } else {
        try {
          const entityHits = player.getEntitiesFromViewDirection({
            maxDistance: MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE,
          });
          for (const hit of entityHits) {
            if (isValidHookshotTarget(player, hit.entity) && isHeavyEntity(hit.entity)) {
              canHitTarget = true;
              break;
            }
          }
          if (!canHitTarget) {
            const blockHit = player.getBlockFromViewDirection({
              maxDistance: MANUAL_HOOKSHOT_CONFIG.MAX_DISTANCE,
              includePassableBlocks: false,
              includeLiquidBlocks: false,
            });
            canHitTarget = blockHit !== undefined;
          }
        } catch {}
        targetAimCache.set(player.id, {
          canHit: canHitTarget,
          lastCheckTick: system.currentTick,
        });
      }
    }

    // 空ピルの色: 着弾中または射程内で壁/大型モブに当たる時は明るい灰色(§7)、射程外や対象がない時は暗灰色(§8)
    const emptyColor = hook || canHitTarget ? "§7" : "§8";

    if (pills >= maxPills) {
      // 3つ満タン（着地中は薄緑、空中で発動可能な場合は鮮やかな緑）
      player.onScreenDisplay.setActionBar(`${activeColor}(▰▰▰)`);
    } else if (pills === 0) {
      // 0個: 射程内で壁に当たる時/着弾中は明るい空ピル、射程外は暗灰色の空ピル
      player.onScreenDisplay.setActionBar(`${emptyColor}(▰▰▰)`);
    } else {
      // 1〜2個: 蓄積数に応じて表現
      const filled = pills;
      const empty = maxPills - filled;
      const pillBar = activeColor + "▰".repeat(filled) + emptyColor + "▰".repeat(empty);
      player.onScreenDisplay.setActionBar(`§7(${pillBar}§7)`);
    }
  } else if (playersWithPillHud.has(player.id)) {
    // 手に持っておらず、かつフックも刺さっていない場合はピルHUDを非表示（クリア）
    playersWithPillHud.delete(player.id);
    try {
      player.onScreenDisplay.setActionBar("");
    } catch {}
  }
}
```

### ③ 更新ループとイベントリスナーでの呼び出し
```typescript
// 毎フレーム（1tick）更新ループ
system.runInterval(() => {
  updateManualHookshots();
  for (const player of world.getAllPlayers()) {
    updateManualHookshotHud(player);
  }
}, 1);

// プレイヤー死亡時・退出時・リスポーン時のクリーンアップ
playersWithPillHud.delete(player.id);
targetAimCache.delete(player.id);
```
