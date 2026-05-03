import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const rustRoot = path.resolve(scriptDir, "..");
const uiRoot = path.resolve(rustRoot, "..");
const sdkConfigPath = path.join(uiRoot, "tools", "prebuild", "sdk_config.txt");
const rootAndroidGradleProperties = path.join(uiRoot, "android", "gradle.properties");
const moduleAndroidGradleProperties = path.join(rustRoot, "android", "gradle.properties");
const crabyTomlPath = path.join(rustRoot, "craby.toml");
const platformConfigPaths = {
  android: path.join(rustRoot, "craby.android.toml"),
  ios: path.join(rustRoot, "craby.ios.toml"),
};
const ANDROID_NDK_VERSION_KEY = "ANDROID_NDK_VERSION";

const androidToolchains = new Map([
  [
    "aarch64-linux-android",
    {
      envSuffix: "AARCH64_LINUX_ANDROID",
      envLower: "aarch64_linux_android",
      clang: "aarch64-linux-android24-clang",
      clangxx: "aarch64-linux-android24-clang++",
    },
  ],
  [
    "armv7-linux-androideabi",
    {
      envSuffix: "ARMV7_LINUX_ANDROIDEABI",
      envLower: "armv7_linux_androideabi",
      clang: "armv7a-linux-androideabi24-clang",
      clangxx: "armv7a-linux-androideabi24-clang++",
    },
  ],
  [
    "x86_64-linux-android",
    {
      envSuffix: "X86_64_LINUX_ANDROID",
      envLower: "x86_64_linux_android",
      clang: "x86_64-linux-android24-clang",
      clangxx: "x86_64-linux-android24-clang++",
    },
  ],
  [
    "i686-linux-android",
    {
      envSuffix: "I686_LINUX_ANDROID",
      envLower: "i686_linux_android",
      clang: "i686-linux-android24-clang",
      clangxx: "i686-linux-android24-clang++",
    },
  ],
]);

function readProperties(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const properties = {};
  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("!")) {
      continue;
    }

    const separatorIndex = line.search(/[:=]/);
    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    properties[key] = value;
  }

  return properties;
}

function readEnvStyleConfig(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return readProperties(filePath);
}

function getAndroidSdkRoot() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) {
    throw new Error("ANDROID_HOME or ANDROID_SDK_ROOT is not set.");
  }
  return sdkRoot;
}

function getConfiguredNdkVersion() {
  const sdkConfig = readEnvStyleConfig(sdkConfigPath);
  const rootProperties = readProperties(rootAndroidGradleProperties);
  const moduleProperties = readProperties(moduleAndroidGradleProperties);

  return (
    process.env.LONANOTE_ANDROID_NDK_VERSION ||
    sdkConfig[ANDROID_NDK_VERSION_KEY] ||
    rootProperties["android.ndkVersion"] ||
    moduleProperties["android.ndkVersion"] ||
    moduleProperties.LonanoteRustModule_ndkVersion
  );
}

function getPrebuiltTag(ndkRoot) {
  const prebuiltRoot = path.join(ndkRoot, "toolchains", "llvm", "prebuilt");
  const entries = fs
    .readdirSync(prebuiltRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory());
  const names = entries.map((entry) => entry.name);

  const preferredPrefixes =
    process.platform === "win32"
      ? ["windows-"]
      : process.platform === "darwin"
        ? [os.arch() === "arm64" ? "darwin-arm64" : "darwin-x86_64", "darwin-"]
        : ["linux-"];

  for (const prefix of preferredPrefixes) {
    const match = names.find((name) => name === prefix || name.startsWith(prefix));
    if (match) {
      return match;
    }
  }

  throw new Error(
    `Unable to locate Android NDK prebuilt toolchain for ${process.platform}/${os.arch()}.`,
  );
}

function getAndroidNdkRoot(sdkRoot, ndkVersion) {
  if (process.env.LONANOTE_ANDROID_NDK) {
    return process.env.LONANOTE_ANDROID_NDK;
  }

  if (!ndkVersion) {
    throw new Error("android.ndkVersion is not configured.");
  }

  const ndkRoot = path.join(sdkRoot, "ndk", ndkVersion);
  if (!fs.existsSync(ndkRoot)) {
    throw new Error(`Configured NDK ${ndkVersion} is not installed at ${ndkRoot}.`);
  }

  return ndkRoot;
}

function getExecutableName(baseName) {
  return process.platform === "win32" ? `${baseName}.cmd` : baseName;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function extractSectionContent(content, sectionName) {
  const sectionMatch = content.match(
    new RegExp(`\\[${sectionName}\\]([\\s\\S]*?)(?:\\r?\\n\\[[^\\]]+\\]|$)`),
  );

  if (!sectionMatch) {
    throw new Error(`Section [${sectionName}] not found.`);
  }

  return sectionMatch[1];
}

function extractSectionTargets(content, sectionName) {
  const sectionContent = extractSectionContent(content, sectionName);
  const targetsMatch = sectionContent.match(/^[ \t]*targets\s*=\s*\[((?:.|\r|\n)*?)\]/m);

  if (!targetsMatch) {
    throw new Error(`targets not found in [${sectionName}] section.`);
  }

  return Array.from(targetsMatch[1].matchAll(/"([^"]+)"/g), (match) => match[1]);
}

function renderTargets(targets) {
  if (targets.length === 0) {
    return "targets = []";
  }

  const lines = targets.map((target) => `  "${target}",`);
  return ["targets = [", ...lines, "]"].join("\n");
}

function replaceSectionTargets(content, sectionName, targets) {
  const sectionContent = extractSectionContent(content, sectionName);
  const currentTargetsMatch = sectionContent.match(/^[ \t]*targets\s*=\s*\[((?:.|\r|\n)*?)\]/m);

  if (!currentTargetsMatch) {
    throw new Error(`targets not found in [${sectionName}] section.`);
  }

  const nextSectionContent = sectionContent.replace(
    /^[ \t]*targets\s*=\s*\[((?:.|\r|\n)*?)\]/m,
    renderTargets(targets),
  );

  return content.replace(sectionContent, nextSectionContent);
}

function syncCrabyTargets(configPath) {
  if (!fs.existsSync(crabyTomlPath)) {
    throw new Error(`craby.toml not found: ${crabyTomlPath}`);
  }
  if (!fs.existsSync(configPath)) {
    throw new Error(`Platform config not found: ${configPath}`);
  }

  const originalContent = fs.readFileSync(crabyTomlPath, "utf8");
  const sourceContent = fs.readFileSync(configPath, "utf8");
  const androidTargets = extractSectionTargets(sourceContent, "android");
  const iosTargets = extractSectionTargets(sourceContent, "ios");

  let nextContent = replaceSectionTargets(originalContent, "android", androidTargets);
  nextContent = replaceSectionTargets(nextContent, "ios", iosTargets);

  if (nextContent !== originalContent) {
    fs.writeFileSync(crabyTomlPath, nextContent, "utf8");
  }

  return {
    originalContent,
    androidTargets,
    iosTargets,
  };
}

function restoreCrabyToml(originalContent) {
  fs.writeFileSync(crabyTomlPath, originalContent, "utf8");
}

function syncIosXcframeworkArtifacts() {
  const xcframeworkRoot = path.join(
    rustRoot,
    "ios",
    "framework",
    "liblonanoterustmodule.xcframework",
  );
  const slices = [
    {
      identifier: "ios-arm64",
      source: path.join(
        rustRoot,
        "target",
        "aarch64-apple-ios",
        "release",
        "liblonanoterustmodule.a",
      ),
    },
    {
      identifier: "ios-arm64_x86_64-simulator",
      source: path.join(
        rustRoot,
        "target",
        "ios-arm64_x86_64-simulator",
        "release",
        "liblonanoterustmodule.a",
      ),
    },
  ];

  if (!fs.existsSync(xcframeworkRoot)) {
    throw new Error(`XCFramework not found: ${xcframeworkRoot}`);
  }

  for (const slice of slices) {
    if (!fs.existsSync(slice.source)) {
      throw new Error(`Expected iOS static library not found: ${slice.source}`);
    }

    const sliceDir = path.join(xcframeworkRoot, slice.identifier);
    ensureDir(sliceDir);
    fs.copyFileSync(slice.source, path.join(sliceDir, "liblonanoterustmodule-prebuilt.a"));
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    cwd: rustRoot,
    env: options.env || process.env,
    shell: false,
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`,
    );
  }
}

function buildIos() {
  run("bun", ["x", "craby", "build"]);
  syncIosXcframeworkArtifacts();
  run("bun", ["x", "tsdown"]);
}

function buildAndroid(androidTargets) {
  const sdkRoot = getAndroidSdkRoot();
  const ndkVersion = getConfiguredNdkVersion();
  const ndkRoot = getAndroidNdkRoot(sdkRoot, ndkVersion);
  const prebuiltTag = getPrebuiltTag(ndkRoot);
  const toolchainBin = path.join(ndkRoot, "toolchains", "llvm", "prebuilt", prebuiltTag, "bin");

  if (androidTargets.length === 0) {
    throw new Error("No Android targets configured in the selected Craby config.");
  }

  console.log(`Using Android SDK: ${sdkRoot}`);
  console.log(`Using Android NDK: ${ndkRoot}`);
  console.log(`Using Craby Android targets: ${androidTargets.join(", ")}`);

  const env = {
    ...process.env,
    ANDROID_NDK_HOME: ndkRoot,
    ANDROID_NDK_ROOT: ndkRoot,
    LONANOTE_ANDROID_NDK: ndkRoot,
  };

  for (const target of androidTargets) {
    const toolchain = androidToolchains.get(target);
    if (!toolchain) {
      throw new Error(`Unsupported Android target in Craby config: ${target}`);
    }

    const clang = path.join(toolchainBin, getExecutableName(toolchain.clang));
    const clangxx = path.join(toolchainBin, getExecutableName(toolchain.clangxx));

    if (!fs.existsSync(clang)) {
      throw new Error(`Android clang not found: ${clang}`);
    }
    if (!fs.existsSync(clangxx)) {
      throw new Error(`Android clang++ not found: ${clangxx}`);
    }

    env[`CC_${toolchain.envLower}`] = clang;
    env[`CXX_${toolchain.envLower}`] = clangxx;
    env[`CARGO_TARGET_${toolchain.envSuffix}_LINKER`] = clang;
  }

  run("bun", ["x", "craby", "build"], { env });
  run("bun", ["x", "tsdown"], { env });
}

function parsePlatformArg() {
  const platform = process.argv[2];
  if (!platform || !(platform in platformConfigPaths)) {
    throw new Error("Usage: node ./scripts/build.mjs <android|ios>");
  }

  return platform;
}

function main() {
  const platform = parsePlatformArg();
  const configPath = platformConfigPaths[platform];
  const { originalContent, androidTargets, iosTargets } = syncCrabyTargets(configPath);
  let buildError;

  try {
    console.log(`Using Craby config: ${path.basename(configPath)}`);
    console.log(`Using Craby iOS targets: ${iosTargets.join(", ") || "(none)"}`);

    if (platform === "android") {
      buildAndroid(androidTargets);
      return;
    }

    buildIos();
  } catch (error) {
    buildError = error;
  } finally {
    try {
      restoreCrabyToml(originalContent);
      console.log("Restored craby.toml");
    } catch (restoreError) {
      if (buildError) {
        throw new AggregateError(
          [buildError, restoreError],
          "Build failed and craby.toml could not be restored.",
        );
      }

      throw restoreError;
    }
  }

  if (buildError) {
    throw buildError;
  }
}

main();
