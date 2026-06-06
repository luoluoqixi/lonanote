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

// ─── 执行命令的辅助函数 ──────────────────────────────────────
function run(cmd, opts = {}) {
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

// iOS CI 构建命令：xcodebuild 编译（不启动模拟器）
const iosWorkspace = "ios/lonanote.xcworkspace";
const iosScheme = "lonanote";
const iosXcodebuildCmd = `xcodebuild -workspace ${iosWorkspace} -scheme ${iosScheme} -configuration Release -sdk iphonesimulator build`;

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

  /** 构建 iOS .app（CI 模式，直接用 xcodebuild，不启动模拟器） */
  "ios:ci": {
    cmd: `cross-env APP_MODE=production ${iosXcodebuildCmd}`,
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

  // 复制产物（传入 key 判断 CI 模式）
  if (SKIP_COPY.has(key)) {
    console.log("  → web 产物在 dist/ 中，跳过复制");
  } else {
    copyArtifacts(key);
  }

  console.log("\n✅ 构建完成！");
}

// ═══════════════════════════════════════════════════════════════
//  复制产物
// ═══════════════════════════════════════════════════════════════
function copyArtifacts(buildKey) {
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
  } else if (buildKey === "ios:ci") {
    // CI 模式：尝试从 DerivedData 导出 .ipa
    const derivedData = path.join(
      process.env.HOME || process.env.USERPROFILE || "",
      "Library",
      "Developer",
      "Xcode",
      "DerivedData",
    );
    if (!fs.existsSync(derivedData)) {
      console.log("  → 未找到 DerivedData 目录，跳过 iOS 产物复制");
      return;
    }

    // 查找最新的 lonanote-* 目录
    const dirs = fs
      .readdirSync(derivedData)
      .filter((d) => d.startsWith("lonanote-"))
      .map((d) => ({
        name: d,
        mtime: fs.statSync(path.join(derivedData, d)).mtimeMs,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (dirs.length === 0) {
      console.log("  → 未找到 DerivedData 中的 lonanote 构建目录，跳过 iOS 产物复制");
      return;
    }

    const appDir = path.join(
      derivedData,
      dirs[0].name,
      "Build",
      "Products",
      "Release-iphonesimulator",
    );
    if (!fs.existsSync(appDir)) {
      console.log(`  → 未找到构建产物目录: ${appDir}`);
      return;
    }

    // 复制 .app
    const appFiles = fs.readdirSync(appDir).filter((f) => f.endsWith(".app"));
    for (const file of appFiles) {
      const src = path.join(appDir, file);
      const dst = path.join(outputDir, file);
      fs.cpSync(src, dst, { recursive: true });
      const sizeMB = (fs.statSync(dst).size / 1024 / 1024).toFixed(1);
      console.log(`  ✓ ${file}  (${sizeMB} MB)`);
    }
    console.log("  → 如需 .ipa，可在 macOS 上使用 xcodebuild -exportArchive 导出");
  } else {
    // 非 CI 的 iOS 构建（设备模式），产物在 DerivedData 中，暂不复制
    console.log("  → iOS 产物在 DerivedData 中，暂不自动复制到 build/");
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
