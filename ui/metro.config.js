// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");
const { blockList, watchBlockList } = require("./tools/metro_ignore");

const defaultConfig = getDefaultConfig(__dirname);

/** @type {import('expo/metro-config').MetroConfig} */
const config = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    blockList: blockList,
  },
  watcher: {
    ...defaultConfig.watcher,
    watchBlockList: watchBlockList,
  },
};

// Expo Router 与应用可能安装两份 React Navigation。统一从应用 node_modules 解析，
// 确保 NavigationContainer 与消费方使用同一个 React Context。
config.resolver.disableHierarchicalLookup = true;
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, "node_modules"),
  ...config.resolver.nodeModulesPaths,
];

// "rn-ui-kit": "file:../../rn_ui_kit/packages/rn-ui-kit",
// "rn-ui-kit": "github:luoluoqixi/rn-ui-kit#rn-ui-kit-1.0.5",
// Bun 的 file: 依赖位于工程外时，让 Metro 观察源码。
// 切回 Git / registry 依赖后路径会落入 node_modules，此配置会自动停用。
const rnUiKitRoot = path.dirname(require.resolve("rn-ui-kit/package.json"));
if (!rnUiKitRoot.startsWith(`${__dirname}${path.sep}`)) {
  config.watchFolders = [...config.watchFolders, rnUiKitRoot];
}

// Expo createFileMap-fork 使用 @expo/metro-file-map，不读取 watcher.watchBlockList；
// 通过全局变量让 @expo/metro-file-map patch 在 watch 阶段使用更宽的忽略规则。
globalThis.__LONANOTE_METRO_WATCH_IGNORE__ = watchBlockList;

module.exports = config;
