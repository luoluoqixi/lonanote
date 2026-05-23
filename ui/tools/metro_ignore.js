const path = require("path");
const exclusionList = require("metro-config/private/defaults/exclusionList").default;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function createRootDirPattern(dirName) {
  const absoluteDir = path.resolve(__dirname, "..", dirName);
  const escapedDir = escapeRegExp(absoluteDir);
  const escapedSep = escapeRegExp(path.sep);

  return new RegExp(`^${escapedDir}(?:${escapedSep}.*)?`);
}

const blockListEntries = [
  ".cxx-android",
  ".cxx",
  "android_release",
  "android_dev",
  "android",
  "dist",
  "ios",
  "src-tauri",
  "target",
  "tools",
].map(createRootDirPattern);

const watchBlockListEntries = [
  ...blockListEntries,
  ...[".expo", "node_modules", "rust"].map(createRootDirPattern),
];

module.exports = {
  blockList: exclusionList(blockListEntries),
  watchBlockList: exclusionList(watchBlockListEntries),
};
