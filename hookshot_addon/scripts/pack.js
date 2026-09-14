const fs = require('fs');
const path = require('path');
const { ZipArchive } = require('archiver');

// パスの解決
const addonDir = path.resolve(__dirname, '..');
const rootDir = path.resolve(addonDir, '..');
const distDir = path.join(rootDir, 'dist');
const localDistDir = path.join(addonDir, 'dist');
const bpDir = path.join(addonDir, 'behavior_pack');
const rpDir = path.join(addonDir, 'resource_pack');
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
    console.log(`🔼 [Manual Hookshot] バージョンを更新します: [${newVersion.join(', ')}]`);

    if (bpManifest.header?.name) {
      if (/v\d+/i.test(bpManifest.header.name)) {
        bpManifest.header.name = bpManifest.header.name.replace(/v\d+/i, `v${newVersion[2]}`);
      } else {
        bpManifest.header.name = `${bpManifest.header.name} v${newVersion[2]}`;
      }
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
        if (/v\d+/i.test(rpManifest.header.name)) {
          rpManifest.header.name = rpManifest.header.name.replace(/v\d+/i, `v${newVersion[2]}`);
        } else {
          rpManifest.header.name = `${rpManifest.header.name} v${newVersion[2]}`;
        }
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
    console.log('✅ [Manual Hookshot] manifest.json を更新しました。');
  } catch (error) {
    console.error('[Manual Hookshot] manifest.json の更新中にエラーが発生しました:', error);
    process.exit(1);
  }
} else {
  console.warn(`⚠️ [Manual Hookshot] manifest.json が見つかりませんでした: ${bpManifestPath}`);
}

// ----------------------------------------------------
// 2. 出力先ディレクトリの準備と圧縮
// ----------------------------------------------------
[distDir, localDistDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

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
  console.log('📦 [Manual Hookshot] パッケージング処理を開始します...');
  try {
    const mcaddonPath = path.join(distDir, 'ManualHookshot.mcaddon');
    const bpPackPath = path.join(distDir, 'ManualHookshot_BP.mcpack');
    const rpPackPath = path.join(distDir, 'ManualHookshot_RP.mcpack');

    // 古いファイルを削除（従来の Hookshot.* も含めクリーンアップ）
    [
      mcaddonPath,
      bpPackPath,
      rpPackPath,
      path.join(distDir, 'Hookshot.mcaddon'),
      path.join(distDir, 'Hookshot_BP.mcpack'),
      path.join(distDir, 'Hookshot_RP.mcpack'),
      path.join(localDistDir, 'Hookshot.mcaddon'),
      path.join(localDistDir, 'Hookshot_BP.mcpack'),
      path.join(localDistDir, 'Hookshot_RP.mcpack'),
    ].forEach((file) => {
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

    // localDistDir にもコピー
    [
      [mcaddonPath, path.join(localDistDir, 'ManualHookshot.mcaddon')],
      [bpPackPath, path.join(localDistDir, 'ManualHookshot_BP.mcpack')],
      [rpPackPath, path.join(localDistDir, 'ManualHookshot_RP.mcpack')],
    ].forEach(([src, dest]) => {
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    });

    console.log('\n🎉 [Manual Hookshot] パッケージの生成が完了しました！');
    if (fs.existsSync(mcaddonPath)) {
      console.log(`👉 一括インポート用: dist/ManualHookshot.mcaddon`);
    }
    console.log(`👉 個別インポート用: dist/ManualHookshot_BP.mcpack`);
    if (fs.existsSync(rpPackPath)) {
      console.log(`👉 個別インポート用: dist/ManualHookshot_RP.mcpack`);
    }
    console.log('');
  } catch (error) {
    console.error('[Manual Hookshot] 圧縮中にエラーが発生しました:', error);
    process.exit(1);
  }
}

buildPackages();
