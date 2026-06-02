// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
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

// Expo createFileMap-fork 使用 @expo/metro-file-map，不读取 watcher.watchBlockList；
// 通过全局变量让 @expo/metro-file-map patch 在 watch 阶段使用更宽的忽略规则。
globalThis.__LONANOTE_METRO_WATCH_IGNORE__ = watchBlockList;

module.exports = config;


// deprecated heroui-native

// // Learn more https://docs.expo.io/guides/customizing-metro
// const { getDefaultConfig } = require("expo/metro-config");
// const { withUniwindConfig } = require("uniwind/metro");
// const { blockList, watchBlockList } = require("./tools/metro_ignore");

// const defaultConfig = getDefaultConfig(__dirname);

// /** @type {import('expo/metro-config').MetroConfig} */
// const config = {
//   ...defaultConfig,
//   resolver: {
//     ...defaultConfig.resolver,
//     blockList: blockList,
//   },
//   watcher: {
//     ...defaultConfig.watcher,
//     watchBlockList: watchBlockList,
//   },
// };

// module.exports = {
//   ...withUniwindConfig(config, {
//     // relative path to your global.css file (from previous step)
//     cssEntryFile: "./src/global.css",
//     // (optional) path where we gonna auto-generate typings
//     // defaults to project's root
//     dtsFile: "./src/uniwind-types.d.ts",
//   }),
//   transformerPath: require.resolve("./tools/metro_transformer.cjs"),
// };
