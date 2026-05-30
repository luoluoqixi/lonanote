// 因为打包 android 和 ios 时, 开发模式与生产模式需要使用不同的包名, 而每次 prebuild 后如果包名不同会有问题
// 所以此脚本将自动处理 dev release 模式的 android android_dev android_release 文件夹切换, 不同模式自动切换不同的文件夹

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const IS_DEV = process.env.APP_MODE === "development";

const projectRoot = path.resolve(__dirname, "..");

function buildCheck({ platform, devFolder, releaseFolder }) {
  const useFolder = IS_DEV ? devFolder : releaseFolder;
  const backupFolder = IS_DEV ? releaseFolder : devFolder;

  const platformPath = path.join(projectRoot, platform);
  const usePath = path.join(projectRoot, useFolder);
  const backupPath = path.join(projectRoot, backupFolder);

  console.log(`platform: ${platform}_${IS_DEV ? "dev" : "release"} build check...`);

  if (fs.existsSync(usePath)) {
    console.log(`exists: ${useFolder}, preparing to rename...`);
    if (fs.existsSync(platformPath)) {
      if (fs.existsSync(backupPath)) {
        // 如果此文件夹已存在, 则当前目录有问题, 同时存在如: android android_dev android_release, 需要人工检查
        throw new Error(
          `Error: Both ${backupFolder} and ${useFolder} exist. Please check the directory.`,
        );
      }
      // 备份当前 platform 文件夹到 backupFolder, 如 android -> android_release
      fs.renameSync(platformPath, backupPath);
      console.log(`Renamed ${platform} to ${backupFolder}`);
    }
    // 将 useFolder 重命名为 platform, 如 android_dev -> android
    fs.renameSync(usePath, platformPath);
    console.log(`Renamed ${useFolder} to ${platform}`);
  } else {
    console.log(`No ${useFolder} found. Skipping.`);
  }

  console.log("Build check completed.");
}

function prebuildCheck(data) {
  buildCheck(data);
}

function postbuildCheck({ platform, devFolder, releaseFolder }) {
  const backupFolder = IS_DEV ? devFolder : releaseFolder;

  const platformPath = path.join(projectRoot, platform);
  const backupPath = path.join(projectRoot, backupFolder);

  if (fs.existsSync(backupPath)) {
    throw new Error(`Error: ${backupFolder} still exists after build. Please check the directory.`);
  }
  if (fs.existsSync(platformPath)) {
    // 将 platform 文件夹重命名回 backupFolder, 如 android -> android_dev
    fs.renameSync(platformPath, backupPath);
    console.log(`Renamed ${platform} back to ${backupFolder}`);
  } else {
    console.log(`No ${platform} found after build. Skipping.`);
  }

  console.log("Post-build check completed.");
}

function main() {
  const isPrebuild = args.includes("--prebuild");
  const isPostbuild = args.includes("--postbuild");
  const isAndroid = args.includes("--android");
  const isIOS = args.includes("--ios");
  if (!isAndroid && !isIOS) {
    console.log("No platform specified. Skipping build check.");
    return;
  }
  const platform = isAndroid ? "android" : "ios";
  const devFolder = platform + "_dev";
  const releaseFolder = platform + "_release";

  if (isPostbuild) {
    postbuildCheck({ platform, devFolder, releaseFolder });
  } else if (isPrebuild) {
    prebuildCheck({ platform, devFolder, releaseFolder });
  } else {
    buildCheck({ platform, devFolder, releaseFolder });
  }
}

main();
