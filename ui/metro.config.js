// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { blockList } = require("./tools/metro_ignore");

const defaultConfig = getDefaultConfig(__dirname);

/** @type {import('expo/metro-config').MetroConfig} */
const config = {
  ...defaultConfig,
  resolver: {
    ...defaultConfig.resolver,
    blockList: blockList,
  },
};

module.exports = {
  ...withUniwindConfig(config, {
    // relative path to your global.css file (from previous step)
    cssEntryFile: "./src/global.css",
    // (optional) path where we gonna auto-generate typings
    // defaults to project's root
    dtsFile: "./src/uniwind-types.d.ts",
  }),
  transformerPath: require.resolve("./tools/metro_transformer.cjs"),
};
