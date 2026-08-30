const path = require("node:path");

const rnUiKitRoot = path.dirname(require.resolve("rn-ui-kit/package.json"));
const compilerRoots = [path.join(__dirname, "src"), path.join(rnUiKitRoot, "src")].map(
  (root) => `${path.resolve(root)}${path.sep}`,
);

function shouldCompileWithReactCompiler(filename) {
  return (
    typeof filename === "string" &&
    compilerRoots.some((root) => filename.startsWith(root))
  );
}

module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxRuntime: "automatic",
          // Expo 默认跳过 node_modules；由下方的手动配置统一控制编译范围。
          "react-compiler": false,
        },
      ],
    ],
    plugins: [
      [
        "babel-plugin-react-compiler",
        {
          target: "19",
          sources: shouldCompileWithReactCompiler,
          customOptOutDirectives: ["use no memo", "use no forget", "widget"],
          environment: {
            enableResetCacheOnSourceFileChanges: process.env.NODE_ENV !== "production",
          },
        },
      ],
      "@babel/plugin-proposal-export-namespace-from",
      "react-native-worklets/plugin",
    ],
  };
};
