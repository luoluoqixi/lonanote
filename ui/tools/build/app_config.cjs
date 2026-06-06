/**
 * 应用配置
 *
 * 供 app.config.ts 和 build.cjs 共用。
 * 可传入 isDev 显式指定模式；不传时从 APP_MODE 环境变量自动判断。
 */

function getIsDev(isDev) {
  return isDev ?? process.env.APP_MODE === "development";
}

function getUniqueIdentifier(isDev) {
  return getIsDev(isDev) ? "com.luoluoqixi.lonanote.dev" : "com.luoluoqixi.lonanote";
}

function getAppName(isDev) {
  return getIsDev(isDev) ? "lonanote-dev" : "lonanote";
}

function getScheme(isDev) {
  return getIsDev(isDev) ? "lonanote-dev" : "lonanote";
}

module.exports = {
  getUniqueIdentifier,
  getAppName,
  getScheme,

  // iOS Xcode 项目配置（和 expo slug 保持一致）
  iosWorkspace: `ios/${getAppName(false)}.xcworkspace`,
  iosScheme: getAppName(false),
};
