import { type ConfigContext, type ExpoConfig } from "expo/config";

import pkg from "./package.json";

const IS_DEV = process.env.APP_MODE === "development";
const ENABLE_REACT_COMPILER = true; // !IS_DEV;

console.log(`Running in ${IS_DEV ? "development" : "production"} mode`);

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return "com.luoluoqixi.lonanote.dev";
  }
  return "com.luoluoqixi.lonanote";
};

const getAppName = () => {
  if (IS_DEV) {
    return "lonanote-dev";
  }
  return "lonanote";
};

const getScheme = () => {
  if (IS_DEV) {
    return "lonanote-dev";
  }
  return "lonanote";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: getAppName(),
  slug: "lonanote",
  version: pkg.version,
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme: getScheme(),
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    bundleIdentifier: getUniqueIdentifier(),
    infoPlist: {
      UIViewControllerBasedStatusBarAppearance: true,
    },
    // icon: "./assets/expo.icon",
  },
  android: {
    predictiveBackGestureEnabled: false,
    package: getUniqueIdentifier(),
    adaptiveIcon: {
      foregroundImage: "./assets/images/icon.png",
      backgroundImage: "./assets/images/icon.png",
      backgroundColor: "#2d2e30",
    },
  },
  web: {
    output: "single",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    "./tools/prebuild/with_android_sdk_versions.cjs",
    "./tools/prebuild/with_android_gradle_memory.cjs",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#2d2e30",
        android: {
          image: "./assets/images/splash_icon.png",
          imageWidth: 76,
        },
      },
    ],
    "./tools/prebuild/with_android_native_build_long_path_fix.cjs",
    // "./tools/prebuild/with_android_nested_scroll_view.cjs",
    ["./tools/prebuild/with_android_adaptive_icon_inset.cjs", { inset: "16%" }],
    // ABI splits: 一次构建输出 5 个 APK（4 架构 + 通用）
    "./tools/prebuild/with_android_abi_splits.cjs",
    // Release 签名：通过环境变量 ANDROID_KEYSTORE_PASSWORD 等配置
    // 如未设置则回退到 debug 签名
    // "./tools/prebuild/with_android_release_signing.cjs",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: ENABLE_REACT_COMPILER,
  },
});
