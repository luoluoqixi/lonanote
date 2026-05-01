const fs = require("node:fs/promises");
const path = require("node:path");

const { withFinalizedMod } = require("@expo/config-plugins");

const CONFIG_RELATIVE_PATH = path.join("tools", "prebuild", "sdk_config.txt");
const NDK_PROPERTY_KEY = "android.ndkVersion";
const NDK_CONFIG_KEY = "ANDROID_NDK_VERSION";

function upsertGradleProperty(content, key, value) {
  const propertyPattern = new RegExp(`^${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=.*$`, "m");
  const newLine = `${key}=${value}`;

  if (propertyPattern.test(content)) {
    return content.replace(propertyPattern, newLine);
  }

  const architecturesPattern = /^(reactNativeArchitectures=.*)$/m;
  if (architecturesPattern.test(content)) {
    return content.replace(architecturesPattern, `$1\n${newLine}`);
  }

  return content.endsWith("\n") ? `${content}${newLine}\n` : `${content}\n${newLine}\n`;
}

function parseEnvStyleConfig(content) {
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

async function readSdkConfig(projectRoot) {
  const configPath = path.join(projectRoot, CONFIG_RELATIVE_PATH);
  const content = await fs.readFile(configPath, "utf8");
  return parseEnvStyleConfig(content);
}

module.exports = function withAndroidNdkVersion(config) {
  return withFinalizedMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      const platformProjectRoot = modConfig.modRequest.platformProjectRoot;
      const sdkConfig = await readSdkConfig(projectRoot);

      if (!sdkConfig[NDK_CONFIG_KEY]) {
        throw new Error(`Missing ${NDK_CONFIG_KEY} in ${CONFIG_RELATIVE_PATH}`);
      }

      const gradlePropertiesPath = path.join(platformProjectRoot, "gradle.properties");
      const originalContent = await fs.readFile(gradlePropertiesPath, "utf8");
      const updatedContent = upsertGradleProperty(
        originalContent,
        NDK_PROPERTY_KEY,
        sdkConfig[NDK_CONFIG_KEY],
      );

      if (updatedContent !== originalContent) {
        await fs.writeFile(gradlePropertiesPath, updatedContent, "utf8");
      }

      return modConfig;
    },
  ]);
};
