import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const rustRoot = path.resolve(scriptDir, "..");
const uiRoot = path.resolve(rustRoot, "..");
const rootAndroidGradleProperties = path.join(uiRoot, "android", "gradle.properties");
const moduleAndroidGradleProperties = path.join(rustRoot, "android", "gradle.properties");
const crabyTomlPath = path.join(rustRoot, "craby.toml");

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

function getAndroidSdkRoot() {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (!sdkRoot) {
    throw new Error("ANDROID_HOME or ANDROID_SDK_ROOT is not set.");
  }
  return sdkRoot;
}

function getConfiguredNdkVersion() {
  const rootProperties = readProperties(rootAndroidGradleProperties);
  const moduleProperties = readProperties(moduleAndroidGradleProperties);

  return (
    process.env.LONANOTE_ANDROID_NDK_VERSION ||
    rootProperties["android.ndkVersion"] ||
    moduleProperties["android.ndkVersion"] ||
    moduleProperties.LonanoteRustModule_ndkVersion
  );
}

function getCrabyAndroidTargets() {
  if (!fs.existsSync(crabyTomlPath)) {
    throw new Error(`craby.toml not found: ${crabyTomlPath}`);
  }

  const content = fs.readFileSync(crabyTomlPath, "utf8");
  const androidSectionMatch = content.match(/\[android\]([\s\S]*?)(?:\n\[[^\]]+\]|$)/);
  if (!androidSectionMatch) {
    return [];
  }

  const targetsMatch = androidSectionMatch[1].match(/targets\s*=\s*\[((?:.|\r|\n)*?)\]/m);
  if (!targetsMatch) {
    return [];
  }

  return Array.from(targetsMatch[1].matchAll(/"([^"]+)"/g), (match) => match[1]);
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

function main() {
  const sdkRoot = getAndroidSdkRoot();
  const ndkVersion = getConfiguredNdkVersion();
  const ndkRoot = getAndroidNdkRoot(sdkRoot, ndkVersion);
  const prebuiltTag = getPrebuiltTag(ndkRoot);
  const toolchainBin = path.join(ndkRoot, "toolchains", "llvm", "prebuilt", prebuiltTag, "bin");
  const androidTargets = getCrabyAndroidTargets();

  if (androidTargets.length === 0) {
    throw new Error("No Android targets configured in craby.toml.");
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
      throw new Error(`Unsupported Android target in craby.toml: ${target}`);
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

main();
