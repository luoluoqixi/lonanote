/* eslint-disable quote-props */
/**
 * 统一 Dev / Build 脚本
 *
 * ─── Dev 入口（永不退出）─────────────────────────────────────
 *   node tools/build/build.cjs dev:android     → check:dev + expo run:android --device
 *   node tools/build/build.cjs dev:ios         → check:dev + expo run:ios --device
 *   node tools/build/build.cjs dev:web         → expo start --web
 *   node tools/build/build.cjs dev:web --ci    → CI=1 expo start --web
 *   node tools/build/build.cjs start           → expo start --dev-client
 *
 * ─── Build 入口（退出时复制产物）─────────────────────────────
 *   node tools/build/build.cjs build:android            → 构建 APK 并安装
 *   node tools/build/build.cjs build:android --ci        → CI 模式
 *   node tools/build/build.cjs build:ios
 *   node tools/build/build.cjs build:ios --ci
 *   node tools/build/build.cjs build:web
 *   node tools/build/build.cjs build:web --sourcemap
 *   node tools/build/build.cjs build:web --dev
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "../..");
const buildOutputRoot = path.join(projectRoot, "build");

// 从共用配置读取应用信息
const appConfig = require("./app_config.cjs");

// ─── 执行命令的辅助函数 ──────────────────────────────────────
function run(cmd, opts = {}) {
  console.log(`\nrun: ${cmd}`);
  execSync(cmd, { cwd: projectRoot, stdio: "inherit", ...opts });
}

// ═══════════════════════════════════════════════════════════════
//  命令定义 —— 修改这里即可调整实际执行的命令
// ═══════════════════════════════════════════════════════════════

/** Dev 命令（开发模式，永不退出） */
const DEV_COMMANDS = {
  /** 启动 Expo 开发服务器（--dev-client） */
  start: "cross-env APP_MODE=development expo start --dev-client",

  /** 在 Android 设备上运行开发版 */
  "dev:android": "cross-env APP_MODE=development expo run:android --device",

  /** 在 iOS 设备上运行开发版 */
  "dev:ios": "cross-env APP_MODE=development expo run:ios --device",

  /** 启动 Web 开发服务器 */
  "dev:web": "cross-env APP_MODE=development BROWSER=none expo start --web",

  /** 启动 Web 开发服务器（CI 模式，禁用热重载） */
  "dev:web:ci": "cross-env APP_MODE=development BROWSER=none CI=1 expo start --web",
};

/** Build 命令（生产模式，退出时复制产物到 build/） */
const gradlewCmd =
  process.platform === "win32" ? "gradlew.bat assembleRelease" : "./gradlew assembleRelease";

// iOS workspace / scheme 从共用配置读取
const iosWorkspace = appConfig.iosWorkspace;
const iosScheme = appConfig.iosScheme;

const BUILD_COMMANDS = {
  /** 构建 Android APK 并安装到已连接的设备 */
  android: "cross-env APP_MODE=production expo run:android --variant release --device --no-bundler",

  /** 构建 Android APK（CI 模式，直接用 Gradle，不找设备不启模拟器） */
  "android:ci": {
    cmd: `cross-env APP_MODE=production ${gradlewCmd}`,
    cwd: "android",
  },

  /** 构建 iOS .app 并安装到已连接的设备 */
  ios: "cross-env APP_MODE=production expo run:ios --configuration Release --device --no-bundler",

  /** 构建 iOS .app（CI 模式，由 copyArtifacts 完成 archive + .ipa 导出） */
  "ios:ci": {
    cmd: "echo 'iOS CI: see copyArtifacts for archive + ipa export'",
    cwd: ".",
  },

  /** 构建 Web 产物到 dist/（默认） */
  web: "cross-env APP_MODE=production expo export --platform web",

  /** 构建 Web 产物含 sourcemap */
  "web:sourcemap":
    "cross-env APP_MODE=production expo export --platform web --source-maps inline --no-minify",

  /** 构建 Web 产物（开发模式） */
  "web:dev": "cross-env APP_MODE=production expo export --platform web --dev",
};

/** Dev 模式下需要先执行目录切换的平台（android/ios 需要，web 不需要） */
const DEV_NEEDS_CHECK = {
  "dev:android": "node tools/build/build_check.cjs --android --dev",
  "dev:ios": "node tools/build/build_check.cjs --ios --dev",
};

/** Build 模式下需要先执行目录切换的平台 */
const BUILD_NEEDS_CHECK = {
  "build:android": "node tools/build/build_check.cjs --android --prod",
  "build:ios": "node tools/build/build_check.cjs --ios --prod",
};

/** 不需要复制产物的模式 */
const SKIP_COPY = new Set(["web", "web:sourcemap", "web:dev"]);

// ═══════════════════════════════════════════════════════════════
//  参数解析
// ═══════════════════════════════════════════════════════════════

const mode = process.argv[2];
const isCI = process.argv.includes("--ci");
const isSourcemap = process.argv.includes("--sourcemap");
const isDevBuild = process.argv.includes("--dev");

// 检查 mode 是否合法
const buildKey = mode.startsWith("build:") ? mode.replace("build:", "") : mode;
const isValidDev = mode === "start" || Object.hasOwn(DEV_COMMANDS, mode);
const isValidBuild = !isValidDev && Object.hasOwn(BUILD_COMMANDS, buildKey);
if (!isValidDev && !isValidBuild) {
  console.error("用法: node tools/build/build.cjs <mode> [flags]");
  console.error("  Dev:  start | dev:android | dev:ios | dev:web [--ci]");
  console.error("  Build: build:android [--ci] | build:ios [--ci] | build:web [--sourcemap|--dev]");
  process.exit(1);
}

const isDev = isValidDev; // dev 入口

// ═══════════════════════════════════════════════════════════════
//  Dev 入口
// ═══════════════════════════════════════════════════════════════
function devEntry() {
  console.log("\n═══════════════════════════════════════════");
  console.log(`  [dev] ${mode}`);
  console.log("═══════════════════════════════════════════\n");

  // android/ios 需要在执行前切换目录
  const checkCmd = DEV_NEEDS_CHECK[mode];
  if (checkCmd) {
    run(checkCmd);
  }

  // 根据 --ci 标志选择命令
  let cmd = DEV_COMMANDS[mode];
  if (mode === "dev:web" && isCI) {
    cmd = DEV_COMMANDS["dev:web:ci"];
  }
  run(cmd);
}

// ═══════════════════════════════════════════════════════════════
//  Build 入口
// ═══════════════════════════════════════════════════════════════
function buildEntry() {
  // 根据 --ci / --sourcemap / --dev 标志选择构建命令
  let key = mode.replace("build:", ""); // "build:android" → "android"
  if (key === "android" && isCI) key = "android:ci";
  if (key === "ios" && isCI) key = "ios:ci";
  if (key === "web" && isSourcemap) key = "web:sourcemap";
  if (key === "web" && isDevBuild) key = "web:dev";

  const label = key;
  console.log("\n═══════════════════════════════════════════");
  console.log(`  [build] ${label}`);
  console.log("═══════════════════════════════════════════\n");

  // android/ios 需要在执行前切换目录
  const checkCmd = BUILD_NEEDS_CHECK[mode];
  if (checkCmd) {
    run(checkCmd);
  }

  // 执行命令：支持字符串直接执行，或 { cmd, cwd } 指定工作目录
  const entry = BUILD_COMMANDS[key];
  if (typeof entry === "string") {
    run(entry);
  } else {
    execSync(entry.cmd, {
      cwd: path.join(projectRoot, entry.cwd),
      stdio: "inherit",
    });
  }

  // iOS CI：archive + .ipa 导出
  if (key === "ios:ci") {
    buildIosIpa();
  }

  // 复制产物
  if (SKIP_COPY.has(key)) {
    console.log("  → web 产物在 dist/ 中，跳过复制");
  } else {
    copyArtifacts();
  }

  console.log("\n✅ 构建完成！");
}

// ═══════════════════════════════════════════════════════════════
//  iOS CI：构建 .xcarchive + 导出 .ipa（仅 macOS）
// ═══════════════════════════════════════════════════════════════
function buildIosIpa() {
  if (process.platform !== "darwin") {
    console.error("  ✗ iOS 构建仅支持 macOS");
    process.exit(1);
  }

  const iosBuildDir = path.join(projectRoot, "build", "ios");
  fs.mkdirSync(iosBuildDir, { recursive: true });
  const archivePath = path.join(iosBuildDir, "lonanote.xcarchive");

  // Step 1: 构建 .xcarchive
  console.log("  → [1/2] 构建 .xcarchive ...");
  execSync(
    `xcodebuild -workspace ${iosWorkspace} -scheme ${iosScheme} -configuration Release -archivePath ${archivePath} archive`,
    { cwd: projectRoot, stdio: "inherit" },
  );

  // Step 2: 导出 .ipa
  console.log("  → [2/2] 导出 .ipa ...");
  const exportPlist = path.join(iosBuildDir, "export.plist");
  fs.writeFileSync(
    exportPlist,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
</dict>
</plist>`,
  );
  execSync(
    `xcodebuild -exportArchive -archivePath ${archivePath} -exportPath ${iosBuildDir} -exportOptionsPlist ${exportPlist}`,
    { cwd: projectRoot, stdio: "inherit" },
  );
}

// ═══════════════════════════════════════════════════════════════
//  复制产物
// ═══════════════════════════════════════════════════════════════
function copyArtifacts() {
  const platform = mode.includes("ios") ? "ios" : "android";
  const outputDir = path.join(buildOutputRoot, platform);
  fs.mkdirSync(outputDir, { recursive: true });

  if (platform === "android") {
    const apkDir = path.join(projectRoot, "android", "app", "build", "outputs", "apk", "release");
    if (!fs.existsSync(apkDir)) {
      console.warn(`  ⚠ 未找到 APK 目录: ${apkDir}`);
      return;
    }
    const files = fs.readdirSync(apkDir).filter((f) => f.endsWith(".apk"));
    if (files.length === 0) {
      console.warn("  ⚠ 未找到 APK 文件");
      return;
    }
    for (const file of files) {
      const src = path.join(apkDir, file);
      const dst = path.join(outputDir, file);
      fs.copyFileSync(src, dst);
      const sizeMB = (fs.statSync(dst).size / 1024 / 1024).toFixed(1);
      console.log(`  ✓ ${file}  (${sizeMB} MB)`);
    }
  }

  // iOS：仅 CI 模式才复制（.ipa 由 buildIosIpa 生成）
  if (platform === "ios") {
    if (isCI) {
      const iosBuildDir = path.join(buildOutputRoot, "ios");
      if (fs.existsSync(iosBuildDir)) {
        const ipaFiles = fs.readdirSync(iosBuildDir).filter((f) => f.endsWith(".ipa"));
        for (const file of ipaFiles) {
          const sizeMB = (fs.statSync(path.join(iosBuildDir, file)).size / 1024 / 1024).toFixed(1);
          console.log(`  ✓ ${file}  (${sizeMB} MB)`);
        }
      }
    } else {
      console.log("  → 跳过复制 iOS ipa（非 CI 模式）");
    }
  }
}

// ═══════════════════════════════════════════════════════════════
//  入口
// ═══════════════════════════════════════════════════════════════
try {
  if (isDev) {
    devEntry();
  } else {
    buildEntry();
  }
} catch (err) {
  console.error(`\n✗ ${isDev ? "dev" : "build"} 失败: ${err.message}`);
  process.exit(1);
}
