// 因为打包 android 和 ios 时, 开发模式与生产模式需要使用不同的包名, 而每次 prebuild 后如果包名不同会有问题
// 所以此脚本将自动处理 dev release 模式的 android android_dev android_release 文件夹切换, 不同模式自动切换不同的文件夹

const child_process = require("child_process");
const fs = require("fs");
const path = require("path");

const RENAME_DELAY_MS = 500;
const projectRoot = path.resolve(__dirname, "../../");

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exists(p) {
  return fs.existsSync(p);
}

/** rename */
async function renameWithRetry(src, dst) {
  for (let i = 0; i < 5; i++) {
    try {
      if (process.platform === "win32") {
        child_process.execSync(
          `powershell -Command "Move-Item -Path '${src}' -Destination '${dst}' -Force -ErrorAction Stop"`,
          { stdio: "pipe" },
        );
      } else {
        fs.renameSync(src, dst);
      }
      return;
    } catch (err) {
      if (i >= 4) throw err;
      console.warn(`Failed to rename ${src} to ${dst} (attempt ${i + 1}/5). Retrying...`);
      await delay(RENAME_DELAY_MS);
    }
  }
}

async function buildCheck({ platform, devFolder, releaseFolder, isDev }) {
  const useFolder = isDev ? devFolder : releaseFolder;
  const backupFolder = isDev ? releaseFolder : devFolder;

  const platformPath = path.join(projectRoot, platform);
  const usePath = path.join(projectRoot, useFolder);
  const backupPath = path.join(projectRoot, backupFolder);

  console.log(`platform: ${platform}_${isDev ? "dev" : "release"} build check...`);

  if (!exists(usePath)) {
    console.log(`No ${useFolder} found. Skipping.`);
    console.log("Build check completed.");
    return;
  }

  console.log(`exists: ${useFolder}, preparing to rename...`);

  if (exists(platformPath)) {
    if (exists(backupPath)) {
      throw new Error(
        `Error: backup [${backupFolder}] and [${useFolder}] and [${platform}] exist. Please check the directory.`,
      );
    }
    await delay(RENAME_DELAY_MS);
    // 备份 platform → backup
    await renameWithRetry(platformPath, backupPath);
    console.log(`Renamed ${platform} to ${backupFolder}`);
    await delay(RENAME_DELAY_MS);
  }

  // 将 useFolder 重命名为 platform
  await renameWithRetry(usePath, platformPath);
  console.log(`Renamed ${useFolder} to ${platform}`);
  await delay(RENAME_DELAY_MS);

  console.log("Build check completed.");
}

async function postbuildCheck({ platform, devFolder, releaseFolder, isDev }) {
  const backupFolder = isDev ? devFolder : releaseFolder;

  const platformPath = path.join(projectRoot, platform);
  const backupPath = path.join(projectRoot, backupFolder);

  // 检查 backup 是否已存在（冲突）
  if (exists(backupPath)) {
    throw new Error(`Error: ${backupFolder} still exists after build. Please check the directory.`);
  }

  // 检查 platform 是否存在
  if (!exists(platformPath)) {
    console.log(`No ${platform} found after build. Skipping.`);
    console.log("Post-build check completed.");
    return;
  }

  // 将 platform 重命名回 backup
  await renameWithRetry(platformPath, backupPath);
  console.log(`Renamed ${platform} back to ${backupFolder}`);
  await delay(RENAME_DELAY_MS);

  console.log("Post-build check completed.");
}

async function main() {
  const args = process.argv.slice(2);
  // const isPrebuild = args.includes("--prebuild");
  const isPostbuild = args.includes("--postbuild");
  const isAndroid = args.includes("--android");
  const isIOS = args.includes("--ios");
  const isDev = args.includes("--dev");
  const isProd = args.includes("--prod");

  if (!isAndroid && !isIOS) {
    console.log("No platform specified. Skipping build check.");
    return;
  }

  // 通过 --dev / --prod 设置 APP_MODE，优先级高于环境变量
  if (isDev) process.env.APP_MODE = "development";
  if (isProd) process.env.APP_MODE = "production";

  const platform = isAndroid ? "android" : "ios";
  const devFolder = `${platform}_dev`;
  const releaseFolder = `${platform}_release`;

  if (isPostbuild) {
    await postbuildCheck({ platform, devFolder, releaseFolder, isDev });
  } else {
    await buildCheck({ platform, devFolder, releaseFolder, isDev });
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
