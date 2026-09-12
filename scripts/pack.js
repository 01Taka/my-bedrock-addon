const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// パスの解決
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bpDir = path.join(rootDir, "behavior_pack");
const manifestPath = path.join(bpDir, "manifest.json");
const outputPath = path.join(distDir, "MyAddon.mcpack");

// ----------------------------------------------------
// 1. manifest.json のバージョンを自動インクリメント
// ----------------------------------------------------
if (fs.existsSync(manifestPath)) {
  try {
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    // バージョンの末尾（パッチバージョン）を +1
    // 例: [1, 0, 20] -> [1, 0, 21]
    if (Array.isArray(manifest.header?.version)) {
      manifest.header.version[2] += 1;
    }

    const newVersion = manifest.header.version;
    console.log(`🔼 バージョンを更新します: [${newVersion.join(", ")}]`);

    // header.name に "v21" のような表記があれば自動で更新
    if (manifest.header?.name) {
      manifest.header.name = manifest.header.name.replace(
        /v\d+/i,
        `v${newVersion[2]}`,
      );
    }

    // modules 内の各モジュールのバージョンも同期
    if (Array.isArray(manifest.modules)) {
      manifest.modules.forEach((mod) => {
        if (Array.isArray(mod.version)) {
          mod.version = [...newVersion];
        }
      });
    }

    // 更新した manifest.json を書き出し
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf-8");
    console.log("✅ manifest.json を更新しました。");
  } catch (error) {
    console.error("manifest.json の更新中にエラーが発生しました:", error);
    process.exit(1);
  }
} else {
  console.warn(`⚠️ manifest.json が見つかりませんでした: ${manifestPath}`);
}

// ----------------------------------------------------
// 2. 出力先ディレクトリの準備と圧縮
// ----------------------------------------------------
// distフォルダ作成
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// 古い .mcpack があれば削除
if (fs.existsSync(outputPath)) {
  fs.unlinkSync(outputPath);
}

console.log("📦 圧縮処理を開始します...");

// PowerShellのCompress-Archiveを使ってZIP圧縮
try {
  execSync(
    `powershell -NoProfile -Command "Compress-Archive -Path '${bpDir}\\*' -DestinationPath '${outputPath}' -Force"`,
    { stdio: "inherit" },
  );
  console.log(`\n🎉 .mcpack を正常に生成しました！`);
  console.log(`👉 出力先: dist/MyAddon.mcpack\n`);
} catch (error) {
  console.error("圧縮中にエラーが発生しました:", error);
  process.exit(1);
}
