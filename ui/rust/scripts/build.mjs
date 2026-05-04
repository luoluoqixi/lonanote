import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const rustRoot = path.resolve(scriptDir, "..");
const uiRoot = path.resolve(rustRoot, "..");
const workspaceRoot = path.resolve(rustRoot, "..", "..");
const sdkConfigPath = path.join(uiRoot, "tools", "prebuild", "sdk_config.txt");
const rootAndroidGradleProperties = path.join(uiRoot, "android", "gradle.properties");
const moduleAndroidGradleProperties = path.join(rustRoot, "android", "gradle.properties");
const crabyTomlPath = path.join(rustRoot, "craby.toml");

const CACHE_DIR = ".build-cache";

const buildCacheDir = path.join(rustRoot, CACHE_DIR);
const buildCacheManifestPath = path.join(buildCacheDir, "rust-module-build.json");
const platformConfigPaths = {
  android: path.join(rustRoot, "craby.android.toml"),
  ios: path.join(rustRoot, "craby.ios.toml"),
};
const ANDROID_NDK_VERSION_KEY = "ANDROID_NDK_VERSION";
const CACHE_VERSION = 1;
const codeFileExtensions = new Set([
  ".c",
  ".cc",
  ".cpp",
  ".h",
  ".hpp",
  ".js",
  ".jsx",
  ".m",
  ".mm",
  ".rs",
  ".ts",
  ".tsx",
]);
const ignoredDirectoryNames = new Set([
  CACHE_DIR,
  ".craby",
  ".git",
  "build",
  "dist",
  "node_modules",
  "target",
]);
const androidTargetToAbi = new Map([
  ["aarch64-linux-android", "arm64-v8a"],
  ["armv7-linux-androideabi", "armeabi-v7a"],
  ["x86_64-linux-android", "x86_64"],
  ["i686-linux-android", "x86"],
]);

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

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function toWorkspaceRelativePath(filePath) {
  return normalizePath(path.relative(workspaceRoot, filePath));
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function hashString(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function hashFile(filePath) {
  return hashBuffer(fs.readFileSync(filePath));
}

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

function collectCodeFiles(rootPath) {
  const files = [];

  function walk(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (ignoredDirectoryNames.has(entry.name)) {
          continue;
        }

        walk(entryPath);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      if (!codeFileExtensions.has(path.extname(entry.name))) {
        continue;
      }

      files.push(entryPath);
    }
  }

  walk(rootPath);

  return files;
}

function createFileSnapshot(filePaths) {
  const snapshot = {};

  for (const filePath of [...filePaths].sort((left, right) => left.localeCompare(right))) {
    snapshot[toWorkspaceRelativePath(filePath)] = hashFile(filePath);
  }

  return snapshot;
}

function createSnapshotFingerprint(snapshot) {
  return hashString(
    Object.entries(snapshot)
      .map(([filePath, fileHash]) => `${filePath}:${fileHash}`)
      .join("\n"),
  );
}

function getSourceFileSnapshot() {
  const sourceRoots = [
    path.join(rustRoot, "src"),
    path.join(rustRoot, "crates"),
    path.join(workspaceRoot, "rust"),
  ];
  const sourceFiles = sourceRoots.flatMap((rootPath) => collectCodeFiles(rootPath));
  const files = createFileSnapshot(sourceFiles);

  return {
    files,
    fingerprint: createSnapshotFingerprint(files),
  };
}

function getCommonArtifactPaths() {
  return [
    path.join(rustRoot, "dist", "index.js"),
    path.join(rustRoot, "dist", "index.mjs"),
    path.join(rustRoot, "dist", "index.d.ts"),
    path.join(rustRoot, "dist", "index.d.mts"),
  ];
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
  const selectedAndroidTargets = extractSectionTargets(sourceContent, "android");
  const selectedIosTargets = extractSectionTargets(sourceContent, "ios");

  let nextContent = replaceSectionTargets(originalContent, "android", selectedAndroidTargets);
  nextContent = replaceSectionTargets(nextContent, "ios", selectedIosTargets);

  if (nextContent !== originalContent) {
    fs.writeFileSync(crabyTomlPath, nextContent, "utf8");
  }

  return {
    originalContent,
    androidTargets: selectedAndroidTargets,
    iosTargets: selectedIosTargets,
  };
}

function restoreCrabyToml(originalContent) {
  fs.writeFileSync(crabyTomlPath, originalContent, "utf8");
}

function getAndroidArtifactPaths(androidTargets) {
  const artifactPaths = [
    path.join(rustRoot, "android", "src", "main", "jni", "include", "ffi.rs.h"),
    path.join(rustRoot, "android", "src", "main", "jni", "src", "ffi.rs.cc"),
  ];

  for (const target of androidTargets) {
    const abi = androidTargetToAbi.get(target);
    if (!abi) {
      throw new Error(`Unsupported Android target in cache config: ${target}`);
    }

    artifactPaths.push(
      path.join(
        rustRoot,
        "android",
        "src",
        "main",
        "jni",
        "libs",
        abi,
        "liblonanoterustmodule-prebuilt.a",
      ),
    );
  }

  return artifactPaths;
}

function getIosArtifactPaths() {
  const xcframeworkRoot = path.join(
    rustRoot,
    "ios",
    "framework",
    "liblonanoterustmodule.xcframework",
  );

  return [
    path.join(rustRoot, "ios", "include", "ffi.rs.h"),
    path.join(xcframeworkRoot, "Info.plist"),
    path.join(xcframeworkRoot, "ios-arm64", "liblonanoterustmodule-prebuilt.a"),
    path.join(xcframeworkRoot, "ios-arm64_x86_64-simulator", "liblonanoterustmodule-prebuilt.a"),
  ];
}

function getExpectedArtifactPaths(platform, androidTargets) {
  const commonArtifacts = getCommonArtifactPaths();

  if (platform === "android") {
    return [...getAndroidArtifactPaths(androidTargets), ...commonArtifacts];
  }

  return [...getIosArtifactPaths(), ...commonArtifacts];
}

function createArtifactSnapshot(platform, androidTargets) {
  const expectedArtifactPaths = getExpectedArtifactPaths(platform, androidTargets);
  const missingFiles = expectedArtifactPaths.filter((filePath) => !fs.existsSync(filePath));

  if (missingFiles.length > 0) {
    return {
      missingFiles: missingFiles.map((filePath) => toWorkspaceRelativePath(filePath)),
    };
  }

  const files = createFileSnapshot(expectedArtifactPaths);

  return {
    files,
    fingerprint: createSnapshotFingerprint(files),
    missingFiles: [],
  };
}

function loadBuildCache() {
  if (!fs.existsSync(buildCacheManifestPath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(buildCacheManifestPath, "utf8"));
  } catch {
    return null;
  }
}

function saveBuildCache(platform, entry) {
  ensureDir(buildCacheDir);

  const currentCache = loadBuildCache() || {};
  const nextCache = {
    version: CACHE_VERSION,
    platforms: {
      ...(currentCache.platforms || {}),
      [platform]: entry,
    },
  };

  fs.writeFileSync(buildCacheManifestPath, `${JSON.stringify(nextCache, null, 2)}\n`, "utf8");
}

function getTargetFingerprint(targets) {
  return hashString(targets.join("\n"));
}

function shouldSkipBuild({ force, platform, sourceSnapshot, platformTargets }) {
  if (force) {
    return {
      skip: false,
      reason: "Force rebuild requested.",
    };
  }

  const buildCache = loadBuildCache();
  if (!buildCache || buildCache.version !== CACHE_VERSION) {
    return {
      skip: false,
      reason: "Build cache is missing or outdated.",
    };
  }

  const cachedEntry = buildCache.platforms?.[platform];
  if (!cachedEntry) {
    return {
      skip: false,
      reason: `No cached ${platform} build was found.`,
    };
  }

  if (cachedEntry.targetFingerprint !== getTargetFingerprint(platformTargets)) {
    return {
      skip: false,
      reason: `${platform} target list changed.`,
    };
  }

  if (cachedEntry.sourceFingerprint !== sourceSnapshot.fingerprint) {
    return {
      skip: false,
      reason: "Source files changed.",
    };
  }

  const artifactSnapshot = createArtifactSnapshot(
    platform,
    platform === "android" ? platformTargets : [],
  );
  if (artifactSnapshot.missingFiles.length > 0) {
    return {
      skip: false,
      reason: `Missing build artifacts: ${artifactSnapshot.missingFiles.join(", ")}`,
    };
  }

  if (cachedEntry.artifactFingerprint !== artifactSnapshot.fingerprint) {
    return {
      skip: false,
      reason: "Build artifacts changed or were replaced.",
    };
  }

  return {
    skip: true,
    reason: `${platform} build cache hit.`,
  };
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

function parseArgs() {
  const platform = process.argv[2];
  const flags = new Set(process.argv.slice(3));

  if (!platform || !(platform in platformConfigPaths)) {
    throw new Error("Usage: node ./scripts/build.mjs <android|ios> [--force]");
  }

  for (const flag of flags) {
    if (flag !== "--force") {
      throw new Error(`Unknown option: ${flag}`);
    }
  }

  return {
    platform,
    force: flags.has("--force"),
  };
}

function main() {
  const { platform, force } = parseArgs();
  const configPath = platformConfigPaths[platform];
  const configContent = fs.readFileSync(configPath, "utf8");
  const configuredAndroidTargets = extractSectionTargets(configContent, "android");
  const configuredIosTargets = extractSectionTargets(configContent, "ios");
  const platformTargets = platform === "android" ? configuredAndroidTargets : configuredIosTargets;
  const sourceSnapshot = getSourceFileSnapshot();
  const cacheDecision = shouldSkipBuild({
    force,
    platform,
    sourceSnapshot,
    platformTargets,
  });

  console.log(cacheDecision.reason);
  if (cacheDecision.skip) {
    return;
  }

  const { originalContent, androidTargets, iosTargets } = syncCrabyTargets(configPath);
  let buildError;

  try {
    console.log(`Using Craby config: ${path.basename(configPath)}`);
    console.log(`Using Craby iOS targets: ${iosTargets.join(", ") || "(none)"}`);

    if (platform === "android") {
      buildAndroid(androidTargets);
    } else {
      buildIos();
    }

    const artifactSnapshot = createArtifactSnapshot(
      platform,
      platform === "android" ? androidTargets : [],
    );
    if (artifactSnapshot.missingFiles.length > 0) {
      throw new Error(
        `Build completed but required artifacts are missing: ${artifactSnapshot.missingFiles.join(", ")}`,
      );
    }

    saveBuildCache(platform, {
      updatedAt: new Date().toISOString(),
      targetFingerprint: getTargetFingerprint(platformTargets),
      targets: platformTargets,
      sourceFingerprint: sourceSnapshot.fingerprint,
      sourceFiles: sourceSnapshot.files,
      artifactFingerprint: artifactSnapshot.fingerprint,
      artifacts: artifactSnapshot.files,
    });
    console.log(`Saved ${platform} build cache.`);
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
