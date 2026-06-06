/**
 * Expo Config Plugin: Android Release Signing
 *
 * 在 app/build.gradle 中添加 release 签名配置。
 * 密钥信息通过环境变量传入，避免明文存储：
 *   ANDROID_KEYSTORE_FILE    - 密钥库文件路径（相对 android/app/ 或绝对路径）
 *   ANDROID_KEYSTORE_PASSWORD - 密钥库密码
 *   ANDROID_KEY_ALIAS        - 密钥别名
 *   ANDROID_KEY_PASSWORD     - 密钥密码
 *
 * 如果环境变量未设置，回退到 debug 签名（保持开发流畅）。
 *
 * 用法：在 app.config.ts 的 plugins 中添加：
 *   ["./tools/prebuild/with_android_release_signing.cjs", {
 *     keystoreRelativePath: "release.keystore"  // 可选，默认值
 *   }]
 *
 * 首次生成密钥库：
 *   keytool -genkey -v -keystore ui/release.keystore -alias release \
 *     -keyalg RSA -keysize 2048 -validity 10000 \
 *     -storepass <密码> -keypass <密码>
 *   然后将 release.keystore 放到 ui/ 目录下（路径相对于 android/app/ 为 ../..）
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withAndroidReleaseSigning(config, props = {}) {
  const keystoreRelativePath = props.keystoreRelativePath ?? "../../release.keystore";

  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // 避免重复注入
    if (contents.includes("signingConfigs.release")) {
      return modConfig;
    }

    const hasEnvVars =
      process.env.ANDROID_KEYSTORE_FILE ||
      (process.env.ANDROID_KEYSTORE_PASSWORD &&
        process.env.ANDROID_KEY_ALIAS &&
        process.env.ANDROID_KEY_PASSWORD);

    if (!hasEnvVars) {
      console.warn(
        "[withAndroidReleaseSigning] 未设置 ANDROID_KEYSTORE_PASSWORD / ANDROID_KEY_ALIAS / ANDROID_KEY_PASSWORD 环境变量，release 构建将继续使用 debug 签名。",
      );
      return modConfig;
    }

    const keystorePath = process.env.ANDROID_KEYSTORE_FILE || keystoreRelativePath;

    const releaseSigningConfig = `
        release {
            storeFile file('${keystorePath.replace(/'/g, "\\'")}')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: ''
            keyAlias System.getenv('ANDROID_KEY_ALIAS') ?: ''
            keyPassword System.getenv('ANDROID_KEY_PASSWORD') ?: ''
        }
`;

    // 1. 在 signingConfigs.debug 后插入 signingConfigs.release
    const debugSigningEnd = contents.indexOf("keyPassword 'android'\n        }\n    }");
    if (debugSigningEnd === -1) {
      console.warn("[withAndroidReleaseSigning] 未找到 debug signingConfig，跳过");
      return modConfig;
    }

    const insertPos = debugSigningEnd + "keyPassword 'android'\n        }\n    }".length;
    contents = contents.slice(0, insertPos) + releaseSigningConfig + contents.slice(insertPos);

    // 2. 将 release buildType 的 signingConfig 从 debug 改为 release
    const releaseSigningLine = "signingConfig signingConfigs.debug";
    const releaseSigningIndex = contents.indexOf(releaseSigningLine);
    if (releaseSigningIndex !== -1) {
      contents = `${contents.slice(
        0,
        releaseSigningIndex,
      )}signingConfig signingConfigs.release${contents.slice(
        releaseSigningIndex + releaseSigningLine.length,
      )}`;
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
