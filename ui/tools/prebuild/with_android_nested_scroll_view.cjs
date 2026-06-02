/**
 * 启用 RN useNestedScrollViewAndroid（Android NestedScrollView），改善 formSheet 内滚动。
 *
 * loadReactNative() 内部已按 ReleaseLevel 调用过一次 ReactNativeFeatureFlags.override()，
 * 此处只能在之后用 dangerouslyForceOverride，并委托 Stable 配置，仅覆盖 nested scroll 一项。
 */
const { withMainApplication, CodeGenerator } = require("@expo/config-plugins");
const { addImports } = require("@expo/config-plugins/build/android/codeMod");

const MERGE_TAG = "lonanote-use-nested-scroll-view-android";
const CLASS_TAG = "lonanote-nested-scroll-feature-flags-class";

const FEATURE_FLAG_IMPORTS = [
  "com.facebook.react.internal.featureflags.ReactNativeFeatureFlags",
  "com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android",
  "com.facebook.react.internal.featureflags.ReactNativeFeatureFlagsProvider",
];

const FEATURE_FLAGS_CLASS = `private class LonanoteAndroidFeatureFlags(
  base: ReactNativeFeatureFlagsProvider = ReactNativeFeatureFlagsOverrides_RNOSS_Stable_Android(),
) : ReactNativeFeatureFlagsProvider by base {
  override fun useNestedScrollViewAndroid(): Boolean = true
}`;

const FORCE_OVERRIDE_CALL =
  "ReactNativeFeatureFlags.dangerouslyForceOverride(LonanoteAndroidFeatureFlags())";

function isKotlinMainApplication(language) {
  return language === "kotlin" || language === "kt";
}

function isAlreadyApplied(contents) {
  return (
    contents.includes(`@generated begin ${MERGE_TAG}`) ||
    contents.includes("LonanoteAndroidFeatureFlags")
  );
}

function mergeBlock({ src, tag, anchor, offset, newSrc }) {
  return CodeGenerator.mergeContents({
    src,
    comment: "//",
    tag,
    offset,
    anchor,
    newSrc,
  });
}

function withAndroidNestedScrollView(config) {
  return withMainApplication(config, (modConfig) => {
    const { modResults } = modConfig;
    const language = modResults.language ?? "kt";

    if (!isKotlinMainApplication(language)) {
      throw new Error(`${MERGE_TAG}: 仅支持 Kotlin MainApplication，当前为 ${language}`);
    }

    if (isAlreadyApplied(modResults.contents)) {
      return modConfig;
    }

    let contents = addImports(modResults.contents, FEATURE_FLAG_IMPORTS, false);

    const classMerge = mergeBlock({
      src: contents,
      tag: CLASS_TAG,
      anchor: /^class MainApplication/m,
      offset: 0,
      newSrc: `${FEATURE_FLAGS_CLASS}\n\n`,
    });
    if (!classMerge.didMerge) {
      throw new Error(`${MERGE_TAG}: 未找到 class MainApplication`);
    }
    contents = classMerge.contents;

    const callMerge = mergeBlock({
      src: contents,
      tag: MERGE_TAG,
      anchor: /loadReactNative\(this\)/,
      offset: 1,
      newSrc: `    ${FORCE_OVERRIDE_CALL}\n`,
    });
    if (!callMerge.didMerge) {
      throw new Error(`${MERGE_TAG}: 未找到 loadReactNative(this)`);
    }
    contents = callMerge.contents;

    return {
      ...modConfig,
      modResults: {
        ...modResults,
        contents,
      },
    };
  });
}

module.exports = withAndroidNestedScrollView;
