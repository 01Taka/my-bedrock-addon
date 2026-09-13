const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

// パスの解決
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const bpDir = path.join(rootDir, 'behavior_pack');
const rpDir = path.join(rootDir, 'resource_pack');
const bpManifestPath = path.join(bpDir, 'manifest.json');
const rpManifestPath = path.join(rpDir, 'manifest.json');

// ----------------------------------------------------
// 1. manifest.json のバージョンを自動インクリメント & 同期
// ----------------------------------------------------
let newVersion = [1, 0, 0];

if (fs.existsSync(bpManifestPath)) {
  try {
    const bpManifest = JSON.parse(fs.readFileSync(bpManifestPath, 'utf-8'));
    if (Array.isArray(bpManifest.header?.version)) {
      bpManifest.header.version[2] += 1;
      newVersion = bpManifest.header.version;
    }
    console.log(`🔼 バージョンを更新します: [${newVersion.join(", ")}]`);

    if (bpManifest.header?.name) {
      bpManifest.header.name = bpManifest.header.name.replace(
        /v\d+/i,
        `v${newVersion[2]}`,
      );
    }
    if (Array.isArray(bpManifest.modules)) {
      bpManifest.modules.forEach((mod) => {
        if (Array.isArray(mod.version)) {
          mod.version = [...newVersion];
        }
      });
    }

    // RP manifest との同期
    if (fs.existsSync(rpManifestPath)) {
      const rpManifest = JSON.parse(fs.readFileSync(rpManifestPath, 'utf-8'));
      rpManifest.header.version = [...newVersion];
      if (rpManifest.header?.name) {
        rpManifest.header.name = rpManifest.header.name.replace(
          /v\d+/i,
          `v${newVersion[2]}`,
        );
      }
      if (Array.isArray(rpManifest.modules)) {
        rpManifest.modules.forEach((mod) => {
          if (Array.isArray(mod.version)) {
            mod.version = [...newVersion];
          }
        });
      }
      fs.writeFileSync(rpManifestPath, JSON.stringify(rpManifest, null, 2), 'utf-8');

      // BP側の dependencies 内にある RP のバージョンも同期
      if (Array.isArray(bpManifest.dependencies)) {
        const rpDep = bpManifest.dependencies.find(
          (dep) => dep.uuid === rpManifest.header?.uuid
        );
        if (rpDep && Array.isArray(rpDep.version)) {
          rpDep.version = [...newVersion];
        }
      }
    }

    fs.writeFileSync(bpManifestPath, JSON.stringify(bpManifest, null, 2), 'utf-8');
    console.log('✅ manifest.json を更新しました。');
  } catch (error) {
    console.error('manifest.json の更新中にエラーが発生しました:', error);
    process.exit(1);
  }
} else {
  console.warn(`⚠️ manifest.json が見つかりませんでした: ${bpManifestPath}`);
}

// ----------------------------------------------------
// 2. 出力先ディレクトリの準備と圧縮
// ----------------------------------------------------
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

function zipDirectory(sourceDir, outPath, innerPrefix = '') {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(sourceDir, innerPrefix);
    archive.finalize();
  });
}

function createMcAddon(bpSource, rpSource, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    archive.directory(bpSource, 'behavior_pack');
    archive.directory(rpSource, 'resource_pack');
    archive.finalize();
  });
}

async function buildPackages() {
  console.log('📦 パッケージング処理を開始します...');
  try {
    const mcaddonPath = path.join(distDir, 'MyAddon.mcaddon');
    const bpPackPath = path.join(distDir, 'MyAddon_BP.mcpack');
    const rpPackPath = path.join(distDir, 'MyAddon_RP.mcpack');
    const legacyPackPath = path.join(distDir, 'MyAddon.mcpack');
    const legacyZipPath = path.join(distDir, 'MyAddon.zip');

    // 古いファイルを削除
    [mcaddonPath, bpPackPath, rpPackPath, legacyPackPath, legacyZipPath].forEach((file) => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    // 各アーカイブを作成
    await Promise.all([
      zipDirectory(bpDir, bpPackPath, false),
      fs.existsSync(rpDir)
        ? zipDirectory(rpDir, rpPackPath, false)
        : Promise.resolve(),
      fs.existsSync(rpDir)
        ? createMcAddon(bpDir, rpDir, mcaddonPath)
        : Promise.resolve(),
    ]);

    console.log('\n🎉 パッケージの生成が完了しました！');
    if (fs.existsSync(mcaddonPath)) {
      console.log(`👉 一括インポート用: dist/MyAddon.mcaddon`);
    }
    console.log(`👉 個別インポート用: dist/MyAddon_BP.mcpack`);
    if (fs.existsSync(rpPackPath)) {
      console.log(`👉 個別インポート用: dist/MyAddon_RP.mcpack`);
    }
    console.log('');
  } catch (error) {
    console.error('圧縮中にエラーが発生しました:', error);
    process.exit(1);
  }
}

buildPackages();
