const fs = require("node:fs/promises");
const path = require("node:path");

const { withGradleProperties } = require("@expo/config-plugins");

const CONFIG_RELATIVE_PATH = "sdk_config.txt";
const REACT_NATIVE_ARCHITECTURES_KEY = "reactNativeArchitectures";
const NDK_PROPERTY_KEY = "android.ndkVersion";
const MANAGED_ANDROID_PROPERTIES = [
  REACT_NATIVE_ARCHITECTURES_KEY,
  "android.buildToolsVersion",
  "android.compileSdkVersion",
  "android.targetSdkVersion",
  "android.minSdkVersion",
  "android.kotlinVersion",
  NDK_PROPERTY_KEY,
];

function normalizeManagedGradleProperties(gradleProperties, properties) {
  const filteredProperties = gradleProperties.filter(
    (item) => !(item.type === "property" && MANAGED_ANDROID_PROPERTIES.includes(item.key)),
  );
  const propertyItems = properties.map(([key, value]) => ({
    type: "property",
    key,
    value,
  }));
  const architecturesCommentIndex = filteredProperties.findIndex(
    (item) => item.type === "comment" && item.value.includes("reactNativeArchitectures"),
  );
  const insertIndex =
    architecturesCommentIndex >= 0 ? architecturesCommentIndex + 1 : filteredProperties.length;

  filteredProperties.splice(insertIndex, 0, ...propertyItems);
  return filteredProperties;
}

async function readSdkConfig(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_RELATIVE_PATH);
  const content = await fs.readFile(configPath, "utf8");
  const parsedConfig = readEnvStyleConfig(content);

  return validateSdkConfig(parsedConfig);
}

function readEnvStyleConfig(content) {
  const result = {};

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
    result[key] = value;
  }

  return result;
}

function validateSdkConfig(config) {
  return {
    buildToolsVersion: getRequiredString(config, "ANDROID_BUILD_TOOLS_VERSION"),
    compileSdkVersion: getRequiredNumber(config, "ANDROID_COMPILE_SDK_VERSION"),
    kotlinVersion: getRequiredString(config, "ANDROID_KOTLIN_VERSION"),
    minSdkVersion: getRequiredNumber(config, "ANDROID_MIN_SDK_VERSION"),
    ndkVersion: getRequiredString(config, "ANDROID_NDK_VERSION"),
    reactNativeArchitectures: getRequiredString(config, "ANDROID_REACT_NATIVE_ARCHITECTURES"),
    targetSdkVersion: getRequiredNumber(config, "ANDROID_TARGET_SDK_VERSION"),
  };
}

function getRequiredString(config, key) {
  const value = config[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing ${key} in ${CONFIG_RELATIVE_PATH}`);
  }

  return value;
}

function getRequiredNumber(config, key) {
  const rawValue = getRequiredString(config, key);
  const value = Number(rawValue);

  if (Number.isNaN(value)) {
    throw new Error(`Invalid ${key} in ${CONFIG_RELATIVE_PATH}: ${rawValue}`);
  }

  return value;
}

module.exports = function withAndroidSdkVersions(config) {
  const projectRoot = config._internal?.projectRoot;
  if (!projectRoot) {
    throw new Error("Missing Expo project root while applying Android SDK config.");
  }

  return withGradleProperties(config, async (modConfig) => {
    const latestSdkConfig = await readSdkConfig(projectRoot);
    modConfig.modResults = normalizeManagedGradleProperties(modConfig.modResults, [
      [REACT_NATIVE_ARCHITECTURES_KEY, latestSdkConfig.reactNativeArchitectures],
      ["android.buildToolsVersion", latestSdkConfig.buildToolsVersion],
      ["android.compileSdkVersion", String(latestSdkConfig.compileSdkVersion)],
      ["android.targetSdkVersion", String(latestSdkConfig.targetSdkVersion)],
      ["android.minSdkVersion", String(latestSdkConfig.minSdkVersion)],
      ["android.kotlinVersion", latestSdkConfig.kotlinVersion],
      [NDK_PROPERTY_KEY, latestSdkConfig.ndkVersion],
    ]);

    return modConfig;
  });
};
