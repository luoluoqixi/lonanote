/**
 * Expo Config Plugin: Android ABI Splits
 *
 * 在 app/build.gradle 的 android {} 块内注入 splits { abi { ... } }，
 * 使一次 Gradle 构建同时输出每个架构的独立 APK + 通用 APK。
 *
 * 输出位置：android/app/build/outputs/apk/release/
 *   app-armeabi-v7a-release.apk
 *   app-arm64-v8a-release.apk
 *   app-x86-release.apk
 *   app-x86_64-release.apk
 *   app-universal-release.apk
 *
 * 用法：在 app.config.ts 的 plugins 中添加此插件路径。
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

/** 要注入的 splits 配置块 */
const SPLITS_BLOCK = `
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
            universalApk true
        }
    }
`;

module.exports = function withAndroidAbiSplits(config) {
  return withAppBuildGradle(config, (modConfig) => {
    let contents = modConfig.modResults.contents;

    // 避免重复注入
    if (contents.includes("splits {\n        abi {")) {
      return modConfig;
    }

    // 在 android { ... } 块的闭合大括号前插入 splits 配置
    // 查找 "androidResources {" 块之前的最后一个闭合括号（表示 android 块结束的位置）
    // 更稳健的方式：在 `androidResources {` 之前插入
    const androidResourcesMarker = "androidResources {";
    const markerIndex = contents.indexOf(androidResourcesMarker);

    if (markerIndex === -1) {
      console.warn(
        "[withAndroidAbiSplits] 未找到 androidResources {，尝试在 packagingOptions 后插入",
      );
      // 回退：在 packagingOptions 块后插入
      const packagingEndMarker = "}\n    androidResources {";
      const fallbackIndex = contents.indexOf(packagingEndMarker);
      if (fallbackIndex === -1) {
        console.warn("[withAndroidAbiSplits] 无法找到插入位置，跳过");
        return modConfig;
      }
      contents = contents.slice(0, fallbackIndex) + SPLITS_BLOCK + contents.slice(fallbackIndex);
    } else {
      contents = contents.slice(0, markerIndex) + SPLITS_BLOCK + contents.slice(markerIndex);
    }

    modConfig.modResults.contents = contents;
    return modConfig;
  });
};
