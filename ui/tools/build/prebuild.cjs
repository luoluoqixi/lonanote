/**
 * 统一 Prebuild 脚本
 *
 * 将原本需要三步（build_check prebuild → expo prebuild → build_check postbuild）
 * 合并为一个命令。
 *
 * 用法：
 *   node tools/build/prebuild.cjs android dev
 *   node tools/build/prebuild.cjs android prod
 *   node tools/build/prebuild.cjs android both
 *   node tools/build/prebuild.cjs android dev --clean
 *   node tools/build/prebuild.cjs ios prod
 *   node tools/build/prebuild.cjs ios both --clean
 *
 * 参数：
 *   <platform>  android | ios
 *   <mode>      dev | prod | both（同时执行 dev + prod，clean+both 时 prod 不重复 clean）
 *   --clean     可选，传入 --clean 给 expo prebuild
 *   --no-restore 可选，prebuild 后不 restore 目录（给 build:android 用，后面还要跑 build）
 */

const { exec } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execAsync = promisify(exec);

const projectRoot = path.resolve(__dirname, "../..");
const STEP_DELAY_MS = 1000;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, opts = {}) {
  return execAsync(cmd, { cwd: projectRoot, ...opts });
}

// ─── 参数解析 ────────────────────────────────────────────────
const VALID_PLATFORMS = ["android", "ios"];
const VALID_MODES = ["dev", "prod", "both"];

const platform = process.argv[2];
const mode = process.argv[3];
const hasCleanFlag = process.argv.includes("--clean");
const noRestore = process.argv.includes("--no-restore");

if (!VALID_PLATFORMS.includes(platform)) {
  console.error(`错误: 平台必须是 ${VALID_PLATFORMS.join(" | ")}，收到 "${platform}"`);
  process.exit(1);
}
if (!VALID_MODES.includes(mode)) {
  console.error(`错误: 模式必须是 ${VALID_MODES.join(" | ")}，收到 "${mode}"`);
  process.exit(1);
}

// ─── 执行单个模式的 prebuild ─────────────────────────────────
async function runPrebuild(targetMode, isClean) {
  const isDev = targetMode === "dev";
  const appMode = isDev ? "development" : "production";
  const cleanFlag = isClean ? "--clean" : "";
  const expoPrebuildCmd = `npx expo prebuild --platform ${platform} ${cleanFlag}`.trim();

  const title = `${platform} ${targetMode}${isClean ? " (clean)" : ""}`;
  console.log("\n═══════════════════════════════════════════");
  console.log(`  [prebuild] ${title}`);
  console.log("═══════════════════════════════════════════\n");

  // Step 1: build_check --prebuild（切换目录）
  console.log(`  → [1/${noRestore ? "2" : "3"}] build_check --prebuild`);
  await run(`node tools/build/build_check.cjs --${platform} --prebuild`, {
    env: { ...process.env, APP_MODE: appMode },
  });
  await delay(STEP_DELAY_MS);

  // Step 2: expo prebuild
  console.log(`  → [2/${noRestore ? "2" : "3"}] ${expoPrebuildCmd}`);
  await run(expoPrebuildCmd, {
    env: { ...process.env, APP_MODE: appMode },
  });
  await delay(STEP_DELAY_MS);

  // Step 3: build_check --postbuild（恢复目录，--no-restore 时跳过）
  if (!noRestore) {
    console.log("  → [3/3] build_check --postbuild");
    await run(`node tools/build/build_check.cjs --${platform} --postbuild`, {
      env: { ...process.env, APP_MODE: appMode },
    });
  }

  console.log(`  ✓ ${title} 完成\n`);
}

// ─── 主流程 ──────────────────────────────────────────────────
(async () => {
  try {
    if (mode === "both") {
      await runPrebuild("dev", hasCleanFlag);
      // clean+both 时 prod 不重复 clean
      await runPrebuild("prod", false);
    } else {
      await runPrebuild(mode, hasCleanFlag);
    }
  } catch (err) {
    console.error(`\n✗ prebuild 失败: ${err.message}`);
    process.exit(1);
  }
})();
