/**
 * Expo Config Plugin: Android Release Signing
 *
 * 只在 production 构建时生效。从 keystore.local.txt 读取签名配置，
 * 文件不存在或配置无效时自动回退到 debug 签名。
 *
 * keystore.local.txt 格式（参照 sdk_config.txt）：
 *   KEYSTORE_FILE=release.keystore        # 相对 ui/ 的路径
 *   KEYSTORE_PASSWORD=xxx
 *   KEY_ALIAS=release
 *   KEY_PASSWORD=xxx
 *
 * 首次生成密钥库：
 *   keytool -genkey -v -keystore ui/release.keystore -alias release \
 *     -keyalg RSA -keysize 2048 -validity 10000
 */

const fs = require("node:fs");
const path = require("node:path");
const { withAppBuildGradle } = require("@expo/config-plugins");

const KEYSTORE_CONFIG_PATH = "keystore.local.txt";
const CONFIG_KEYS = ["KEYSTORE_FILE", "KEYSTORE_PASSWORD", "KEY_ALIAS", "KEY_PASSWORD"];

function readKeystoreConfig(projectRoot) {
  const configPath = path.join(projectRoot, KEYSTORE_CONFIG_PATH);
  if (!fs.existsSync(configPath)) return null;

  const content = fs.readFileSync(configPath, "utf8");
  const config = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (CONFIG_KEYS.includes(key) && value) {
      config[key] = value;
    }
  }

  // 检查所有必需字段是否都有值
  const hasAllKeys = CONFIG_KEYS.every((k) => config[k]);
  if (!hasAllKeys) return null;

  // 检查密钥库文件是否存在
  const keystorePath = path.resolve(projectRoot, config.KEYSTORE_FILE);
  if (!fs.existsSync(keystorePath)) {
    console.warn(
      `[withAndroidReleaseSigning] 密钥库文件不存在: ${keystorePath}，回退到 debug 签名`,
    );
    return null;
  }

  return config;
}

module.exports = function withAndroidReleaseSigning(config) {
  // 仅在 production 时生效
  const isDev = process.env.APP_MODE === "development";
  if (isDev) return config;

  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // 避免重复注入
    if (contents.includes("signingConfig signingConfigs.release")) {
      return modConfig;
    }

    const keystoreConfig = readKeystoreConfig(modConfig.modRequest.projectRoot);
    if (!keystoreConfig) {
      console.log(
        "[withAndroidReleaseSigning] keystore.local.txt 不存在或配置不完整，使用 debug 签名",
      );
      return modConfig;
    }

    // 计算 keystore 相对于 android/app/ 的路径（build.gradle 在此目录）
    const projectRoot = modConfig.modRequest.projectRoot;
    const keystoreAbs = path.resolve(projectRoot, keystoreConfig.KEYSTORE_FILE);
    const appDir = path.join(projectRoot, "android", "app");
    const keystoreRel = path.relative(appDir, keystoreAbs).replace(/\\/g, "/");

    const releaseSigningConfig = `
        release {
            storeFile file('${keystoreRel.replace(/'/g, "\\'")}')
            storePassword '${keystoreConfig.KEYSTORE_PASSWORD.replace(/'/g, "\\'")}'
            keyAlias '${keystoreConfig.KEY_ALIAS.replace(/'/g, "\\'")}'
            keyPassword '${keystoreConfig.KEY_PASSWORD.replace(/'/g, "\\'")}'
        }
`;

    // 在 signingConfigs.debug 后插入 signingConfigs.release
    const debugEnd = contents.indexOf("keyPassword 'android'\n        }\n    }");
    if (debugEnd === -1) {
      console.warn("[withAndroidReleaseSigning] 未找到 debug signingConfig，跳过");
      return modConfig;
    }
    const insertPos = debugEnd + "keyPassword 'android'\n        }\n    }".length;
    contents = contents.slice(0, insertPos) + releaseSigningConfig + contents.slice(insertPos);

    // 将 release buildType 的 signingConfig 从 debug 改为 release
    contents = contents.replace(
      "signingConfig signingConfigs.debug",
      "signingConfig signingConfigs.release",
    );

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
