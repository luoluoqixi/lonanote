const exclusionList = require("metro-config/private/defaults/exclusionList").default;

const blockList = [
  ".cxx-android",
  ".cxx",
  "android_release",
  "android_dev",
  "android",
  "dist",
  "ios",
  "rust",
  "src-tauri",
  "target",
  "tools",
];

const watchBlockList = [...blockList, ".expo", "node_modules"];

module.exports = {
  blockList: exclusionList(blockList),
  watchBlockList: exclusionList(watchBlockList),
};
