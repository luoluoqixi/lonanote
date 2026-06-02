/**
 * 从当前 node_modules 读取 Expo / React Native 默认 Android SDK 配置，写入 sdk_config.txt。
 *
 * 版本号来源：
 * - compileSdk / targetSdk / minSdk / buildTools / ndk / kotlin → react-native/gradle/libs.versions.toml
 * - reactNativeArchitectures → expo/template.tgz 内 package/android/gradle.properties
 *
 * 用法：
 *   node tools/sync_android_sdk_config.cjs          # 写入 sdk_config.txt 与 rust/android/gradle.properties
 *   node tools/sync_android_sdk_config.cjs --print  # 仅打印，不写文件
 */

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const projectRoot = path.resolve(__dirname, "..");
const sdkConfigPath = path.join(projectRoot, "sdk_config.txt");
const rustGradlePropertiesPath = path.join(projectRoot, "rust", "android", "gradle.properties");
const printOnly = process.argv.includes("--print");

/** rust/android/gradle.properties 中的键 → collectAndroidSdkDefaults 字段 */
const RUST_GRADLE_PROPERTY_KEYS = {
  LonanoteRustModule_kotlinVersion: "kotlinVersion",
  LonanoteRustModule_minSdkVersion: "minSdkVersion",
  LonanoteRustModule_targetSdkVersion: "targetSdkVersion",
  LonanoteRustModule_compileSdkVersion: "compileSdkVersion",
  LonanoteRustModule_ndkVersion: "ndkVersion",
};

const RN_VERSIONS_TOML = path.join(
  projectRoot,
  "node_modules",
  "react-native",
  "gradle",
  "libs.versions.toml",
);
const EXPO_TEMPLATE_TGZ = path.join(projectRoot, "node_modules", "expo", "template.tgz");
const EXPO_TEMPLATE_GRADLE_ENTRY = "package/android/gradle.properties";

const SDK_CONFIG_KEYS = {
  reactNativeArchitectures: "ANDROID_REACT_NATIVE_ARCHITECTURES",
  buildTools: "ANDROID_BUILD_TOOLS_VERSION",
  compileSdk: "ANDROID_COMPILE_SDK_VERSION",
  targetSdk: "ANDROID_TARGET_SDK_VERSION",
  minSdk: "ANDROID_MIN_SDK_VERSION",
  ndkVersion: "ANDROID_NDK_VERSION",
  kotlin: "ANDROID_KOTLIN_VERSION",
};

function readPackageVersion(packageName) {
  const packageJsonPath = path.join(projectRoot, "node_modules", packageName, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(packageJsonPath, "utf8")).version;
}

function parseVersionsToml(content) {
  const versions = {};
  let inVersionsSection = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "[versions]") {
      inVersionsSection = true;
      continue;
    }
    if (line.startsWith("[") && line.endsWith("]")) {
      inVersionsSection = false;
      continue;
    }
    if (!inVersionsSection || !line || line.startsWith("#")) {
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+)\s*=\s*"([^"]*)"\s*$/);
    if (match) {
      versions[match[1]] = match[2];
    }
  }

  return versions;
}

function* iterateTarEntries(tarBuffer) {
  let offset = 0;

  while (offset + 512 <= tarBuffer.length) {
    const header = tarBuffer.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) {
      break;
    }

    const name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const sizeOctal = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = Number.parseInt(sizeOctal, 8) || 0;
    offset += 512;

    const data = tarBuffer.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;

    yield { name, data };
  }
}

function readGradlePropertiesFromExpoTemplate() {
  if (!fs.existsSync(EXPO_TEMPLATE_TGZ)) {
    throw new Error(`未找到 Expo 模板: ${EXPO_TEMPLATE_TGZ}`);
  }

  const tarBuffer = zlib.gunzipSync(fs.readFileSync(EXPO_TEMPLATE_TGZ));
  for (const entry of iterateTarEntries(tarBuffer)) {
    if (entry.name === EXPO_TEMPLATE_GRADLE_ENTRY || entry.name.endsWith("/gradle.properties")) {
      if (entry.name === EXPO_TEMPLATE_GRADLE_ENTRY) {
        return entry.data.toString("utf8");
      }
    }
  }

  throw new Error(`在 expo/template.tgz 中未找到 ${EXPO_TEMPLATE_GRADLE_ENTRY}`);
}

function parseGradleProperty(content, key) {
  const pattern = new RegExp(`^${key}=(.+)$`, "m");
  const match = content.match(pattern);
  if (!match) {
    throw new Error(`gradle.properties 中缺少 ${key}`);
  }
  return match[1].trim();
}

function collectAndroidSdkDefaults() {
  if (!fs.existsSync(RN_VERSIONS_TOML)) {
    throw new Error(`未找到 React Native 版本目录: ${RN_VERSIONS_TOML}，请先执行 bun install`);
  }

  const versions = parseVersionsToml(fs.readFileSync(RN_VERSIONS_TOML, "utf8"));
  const requiredKeys = ["minSdk", "targetSdk", "compileSdk", "buildTools", "ndkVersion", "kotlin"];

  for (const key of requiredKeys) {
    if (!versions[key]) {
      throw new Error(`libs.versions.toml [versions] 中缺少 ${key}`);
    }
  }

  const templateGradle = readGradlePropertiesFromExpoTemplate();
  const reactNativeArchitectures = parseGradleProperty(templateGradle, "reactNativeArchitectures");

  return {
    reactNativeArchitectures,
    buildToolsVersion: versions.buildTools,
    compileSdkVersion: versions.compileSdk,
    targetSdkVersion: versions.targetSdk,
    minSdkVersion: versions.minSdk,
    ndkVersion: versions.ndkVersion,
    kotlinVersion: versions.kotlin,
  };
}

function formatSdkConfigFile(defaults, meta) {
  const lines = [
    "# Android SDK / NDK settings",
    "# 由 tools/sync_android_sdk_config.cjs 自动生成",
    `# expo@${meta.expoVersion ?? "?"}  react-native@${meta.reactNativeVersion ?? "?"}`,
    "# 版本: react-native/gradle/libs.versions.toml",
    `# 架构: expo/template.tgz → ${EXPO_TEMPLATE_GRADLE_ENTRY}`,
    `${SDK_CONFIG_KEYS.reactNativeArchitectures}=${defaults.reactNativeArchitectures}`,
    `${SDK_CONFIG_KEYS.buildTools}=${defaults.buildToolsVersion}`,
    `${SDK_CONFIG_KEYS.compileSdk}=${defaults.compileSdkVersion}`,
    `${SDK_CONFIG_KEYS.targetSdk}=${defaults.targetSdkVersion}`,
    `${SDK_CONFIG_KEYS.minSdk}=${defaults.minSdkVersion}`,
    `${SDK_CONFIG_KEYS.ndkVersion}=${defaults.ndkVersion}`,
    `${SDK_CONFIG_KEYS.kotlin}=${defaults.kotlinVersion}`,
    "",
  ];

  return lines.join("\n");
}

function updateRustGradleProperties(defaults) {
  if (!fs.existsSync(rustGradlePropertiesPath)) {
    throw new Error(`未找到 Rust Android 配置: ${rustGradlePropertiesPath}`);
  }

  const original = fs.readFileSync(rustGradlePropertiesPath, "utf8");
  const hadTrailingNewline = /\r?\n$/.test(original);
  const lines = original.split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  const updatedKeys = [];

  const nextLines = lines.map((line) => {
    for (const [propertyKey, defaultsKey] of Object.entries(RUST_GRADLE_PROPERTY_KEYS)) {
      if (line.startsWith(`${propertyKey}=`)) {
        updatedKeys.push(propertyKey);
        return `${propertyKey}=${defaults[defaultsKey]}`;
      }
    }
    return line;
  });

  for (const propertyKey of Object.keys(RUST_GRADLE_PROPERTY_KEYS)) {
    if (!updatedKeys.includes(propertyKey)) {
      throw new Error(`${rustGradlePropertiesPath} 中缺少 ${propertyKey}=`);
    }
  }

  let output = nextLines.join("\n");
  if (hadTrailingNewline) {
    output += "\n";
  }

  return output;
}

function main() {
  const defaults = collectAndroidSdkDefaults();
  const meta = {
    expoVersion: readPackageVersion("expo"),
    reactNativeVersion: readPackageVersion("react-native"),
  };
  const output = formatSdkConfigFile(defaults, meta);

  console.log("当前 Expo / React Native 默认 Android SDK 配置:\n");
  console.log(output);

  if (printOnly) {
    return;
  }

  fs.writeFileSync(sdkConfigPath, output, "utf8");
  console.log(`已写入 ${path.relative(projectRoot, sdkConfigPath)}`);

  const rustGradleOutput = updateRustGradleProperties(defaults);
  fs.writeFileSync(rustGradlePropertiesPath, rustGradleOutput, "utf8");
  console.log(`已更新 ${path.relative(projectRoot, rustGradlePropertiesPath)}`);
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
