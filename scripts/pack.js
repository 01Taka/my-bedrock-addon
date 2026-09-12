const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// パスの解決
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const bpDir = path.join(rootDir, "behavior_pack");
const outputPath = path.join(distDir, "MyAddon.mcpack");

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
