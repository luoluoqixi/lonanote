const { withAppBuildGradle } = require("@expo/config-plugins");

/**
 * 插件：自动为 Android debug 构建加 .dev 后缀
 */
const DEBUG_SUFFIX = ".dev";

const withDebugSuffix = (config) => {
  return withAppBuildGradle(config, (configObj) => {
    let gradle = configObj.modResults.contents;
    // 只处理 android { ... buildTypes { debug { ... } release { ... } } }
    // 避免误命中 externalNativeBuild 里的嵌套 buildTypes。
    gradle = gradle.replace(
      /(\n\s{4}buildTypes\s*\{\s*\n\s{8}debug\s*\{)([\s\S]*?)(\n\s{8}\}\s*\n\s{8}release\s*\{)/m,
      (match, p1, p2, p3) => {
        if (/applicationIdSuffix/.test(p2)) return match;
        return `${p1}${p2}\n            applicationIdSuffix "${DEBUG_SUFFIX}"${p3}`;
      },
    );
    configObj.modResults.contents = gradle;
    return configObj;
  });
};

module.exports = { withDebugSuffix };
