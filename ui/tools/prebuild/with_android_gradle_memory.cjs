/**
 * RN 0.85 + Expo 56 + New Architecture 的 release 编译会加载大量 module class，
 * 默认 org.gradle.jvmargs（MaxMetaspaceSize=512m）容易在 Kotlin compile 阶段 Metaspace OOM。
 */
const { withGradleProperties } = require("@expo/config-plugins");

/** Gradle daemon：BuildToolsApiClasspathEntrySnapshotTransform 等在此进程内运行 */
const GRADLE_JVM_ARGS =
  "-Xmx4096m -XX:MaxMetaspaceSize=1024m -XX:+HeapDumpOnOutOfMemoryError -Dfile.encoding=UTF-8";

/** Kotlin 编译 daemon：compileReleaseKotlin 独立进程 */
const KOTLIN_DAEMON_JVM_ARGS = "-Xmx2048m -XX:MaxMetaspaceSize=768m";

function upsertGradleProperties(gradleProperties, entries) {
  const keysToReplace = new Set(entries.map(([key]) => key));
  const filtered = gradleProperties.filter(
    (item) => !(item.type === "property" && keysToReplace.has(item.key)),
  );

  for (const [key, value] of entries) {
    filtered.push({ type: "property", key, value });
  }

  return filtered;
}

module.exports = function withAndroidGradleMemory(config) {
  return withGradleProperties(config, (modConfig) => {
    modConfig.modResults = upsertGradleProperties(modConfig.modResults, [
      ["org.gradle.jvmargs", GRADLE_JVM_ARGS],
      ["kotlin.daemon.jvmargs", KOTLIN_DAEMON_JVM_ARGS],
    ]);
    return modConfig;
  });
};
