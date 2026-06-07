import { type ConfigContext, type ExpoConfig } from "expo/config";

import pkg from "./package.json";
import { getAppName, getScheme, getUniqueIdentifier } from "./tools/build/app_config.cjs";

const IS_DEV = process.env.APP_MODE === "development";
const ENABLE_REACT_COMPILER = true;

console.log(
  `Running in ${process.env.APP_MODE === "development" ? "development" : "production"} mode`,
);

const appName = getAppName(IS_DEV);
const scheme = getScheme(IS_DEV);
const bundleIdentifier = getUniqueIdentifier(IS_DEV);

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: "lonanote",
  version: pkg.version,
  orientation: "default",
  icon: "./assets/images/icon.png",
  scheme,
  userInterfaceStyle: "automatic",
  ios: {
    supportsTablet: true,
    deploymentTarget: "16.4",
    bundleIdentifier,
    infoPlist: {
      UIViewControllerBasedStatusBarAppearance: true,
    },
    // icon: "./assets/expo.icon",
  },
  android: {
    predictiveBackGestureEnabled: false,
    package: bundleIdentifier,
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
    // Release 签名：从 keystore.local.txt 读取配置，
    // 文件不存在或配置不全时回退到 debug 签名，仅在 production 生效
    "./tools/prebuild/with_android_release_signing.cjs",
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: ENABLE_REACT_COMPILER,
  },
});
