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

function getDevHost() {
  function isPrivateIpv4(address) {
    return (
      address.startsWith("192.168.") ||
      address.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(address)
    );
  }
  const os = require("os");
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      const isIpv4 = entry.family === "IPv4" || entry.family === 4;
      if (isIpv4 && !entry.internal && isPrivateIpv4(entry.address)) {
        return entry.address;
      }
    }
  }
  return "localhost";
}

module.exports = {
  getUniqueIdentifier,
  getAppName,
  getScheme,
  getDevHost,

  // iOS Xcode 项目配置（和 expo slug 保持一致）
  iosWorkspace: `ios/${getAppName(false)}.xcworkspace`,
  iosScheme: getAppName(false),
};
