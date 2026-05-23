/* eslint-disable quotes */

const fs = require("node:fs/promises");
const path = require("node:path");

const { withFinalizedMod } = require("@expo/config-plugins");

const NINJA_RELATIVE_PATH = path.join("rust", "scripts", "ninja_1.13.2_fix_long_path.exe");
const OBJECT_PATH_MAX = 1024;
const CMAKE_STAGING_ROOT = "./.cxx";
const TARGET_LIBRARY_PROJECTS = [
  "expo-modules-core",
  "react-native-gesture-handler",
  "react-native-reanimated",
  "react-native-screens",
  "react-native-worklets",
];
const IS_WINDOWS = process.platform === "win32";

function toGradlePath(value) {
  return value.replace(/\\/g, "/");
}

function escapeForGradleString(value) {
  return value.replace(/\\/g, "\\\\");
}

function createCmakeArguments({ ninjaPath }) {
  return [`-DCMAKE_MAKE_PROGRAM=${ninjaPath}`, `-DCMAKE_OBJECT_PATH_MAX=${OBJECT_PATH_MAX}`];
}

function createExternalNativeBuildBlock({ ninjaPath }) {
  const argumentsList = createCmakeArguments({ ninjaPath })
    .map((argument) => `"${argument}"`)
    .join(", ");

  return [
    "        externalNativeBuild {",
    "            cmake {",
    `                arguments ${argumentsList}`,
    "            }",
    "        }",
  ].join("\n");
}

function createAppExternalNativeBuildBlock() {
  return [
    "    externalNativeBuild {",
    "        cmake {",
    `            buildStagingDirectory rootProject.file('${CMAKE_STAGING_ROOT}/app')`,
    "        }",
    "    }",
  ].join("\n");
}

function createLibraryGradleBlock({ ninjaPath, targetProjects }) {
  const projectNames = targetProjects.map((name) => `    '${name}',`).join("\n");
  const longPathArgs = createCmakeArguments({
    ninjaPath: "${lonanoteLibraryNativeBuildLongPathFix.ninjaPath}",
  }).map((argument) => `      "${argument}",`);

  return [
    "def lonanoteLibraryNativeBuildLongPathFix = [",
    `  ninjaPath: '${ninjaPath}',`,
    `  objectPathMax: ${OBJECT_PATH_MAX},`,
    "  projectNames: [",
    projectNames,
    "  ],",
    "]",
    "",
    "subprojects { subproject ->",
    "  afterEvaluate {",
    "    if (!lonanoteLibraryNativeBuildLongPathFix.projectNames.contains(subproject.name)) {",
    "      return",
    "    }",
    "",
    "    def androidExt = subproject.extensions.findByName('android')",
    "    def defaultConfigCmake = androidExt?.defaultConfig?.externalNativeBuild?.cmake",
    "    def moduleCmake = androidExt?.externalNativeBuild?.cmake",
    "    if (defaultConfigCmake == null || moduleCmake == null) {",
    "      return",
    "    }",
    "",
    `    moduleCmake.buildStagingDirectory = rootProject.file("${CMAKE_STAGING_ROOT}/\${subproject.name}")`,
    "",
    "    def longPathArgs = [",
    ...longPathArgs,
    "    ]",
    "",
    "    longPathArgs.each { arg ->",
    "      if (!defaultConfigCmake.arguments.contains(arg)) {",
    "        defaultConfigCmake.arguments.add(arg)",
    "      }",
    "    }",
    "  }",
    "}",
  ].join("\n");
}

function patchDefaultConfig(content, block) {
  const defaultConfigPattern = /(\n {4}defaultConfig \{\n)([\s\S]*?)(\n {4}\})/;
  const match = content.match(defaultConfigPattern);

  if (!match) {
    throw new Error("Could not find android.defaultConfig block in android/app/build.gradle");
  }

  const [, prefix, body, suffix] = match;

  const externalNativeBuildStart = body.indexOf("\n        externalNativeBuild {");
  if (externalNativeBuildStart !== -1) {
    const bodyBeforeExternalNativeBuild = body
      .slice(0, externalNativeBuildStart)
      .replace(/\s+$/, "");
    const updatedBody = `${bodyBeforeExternalNativeBuild}\n${block}\n`;

    return `${content.slice(0, match.index)}${prefix}${updatedBody}${suffix}${content.slice(match.index + match[0].length)}`;
  }

  const trimmedBody = body.replace(/\s+$/, "");
  const updatedBody = `${trimmedBody}\n${block}\n`;
  return `${content.slice(0, match.index)}${prefix}${updatedBody}${suffix}${content.slice(match.index + match[0].length)}`;
}

function patchAndroidExternalNativeBuild(content, block) {
  const anchor = "\n    signingConfigs {";
  const topLevelExternalNativeBuildPattern =
    /(\n {4}externalNativeBuild \{\n(?: {8}.*\n)+ {4}\}\n)+(?=\n {4}signingConfigs \{)/;

  if (topLevelExternalNativeBuildPattern.test(content)) {
    return content.replace(topLevelExternalNativeBuildPattern, `\n${block}\n`);
  }

  if (!content.includes(anchor)) {
    throw new Error("Could not find app android.signingConfigs block in android/app/build.gradle");
  }

  return content.replace(anchor, `\n\n${block}\n${anchor}`);
}

function patchRootBuildGradle(content, block) {
  const wrapperStart = "def lonanoteWriteAndroidToolchainWrapper = {";
  const blockStart = "def lonanoteLibraryNativeBuildLongPathFix = [";
  const anchor = 'apply plugin: "expo-root-project"';

  if (content.includes(wrapperStart) || content.includes(blockStart)) {
    const startIndex = content.includes(wrapperStart)
      ? content.indexOf(wrapperStart)
      : content.indexOf(blockStart);
    const anchorIndex = content.indexOf(anchor);

    if (anchorIndex === -1) {
      throw new Error("Could not find insertion point in android/build.gradle");
    }

    return `${content.slice(0, startIndex)}${block}\n\n${content.slice(anchorIndex)}`;
  }

  if (!content.includes(anchor)) {
    throw new Error("Could not find insertion point in android/build.gradle");
  }

  return content.replace(anchor, `${block}\n\n${anchor}`);
}

module.exports = function withAndroidNativeBuildLongPathFix(config) {
  return withFinalizedMod(config, [
    "android",
    async (modConfig) => {
      if (!IS_WINDOWS) {
        return modConfig;
      }

      const projectRoot = modConfig.modRequest.projectRoot;
      const platformProjectRoot = modConfig.modRequest.platformProjectRoot;
      const appBuildGradlePath = path.join(platformProjectRoot, "app", "build.gradle");
      const rootBuildGradlePath = path.join(platformProjectRoot, "build.gradle");
      const ninjaAbsolutePath = escapeForGradleString(path.join(projectRoot, NINJA_RELATIVE_PATH));
      const ninjaGradlePath = toGradlePath(path.join(projectRoot, NINJA_RELATIVE_PATH));
      const externalNativeBuildBlock = createExternalNativeBuildBlock({
        ninjaPath: ninjaAbsolutePath,
      });
      const appExternalNativeBuildBlock = createAppExternalNativeBuildBlock();
      const libraryGradleBlock = createLibraryGradleBlock({
        ninjaPath: ninjaGradlePath,
        targetProjects: TARGET_LIBRARY_PROJECTS,
      });

      const [originalAppBuildGradle, originalRootBuildGradle] = await Promise.all([
        fs.readFile(appBuildGradlePath, "utf8"),
        fs.readFile(rootBuildGradlePath, "utf8"),
      ]);

      const updatedAppBuildGradle = patchDefaultConfig(
        originalAppBuildGradle,
        externalNativeBuildBlock,
      );
      const updatedAppBuildGradleWithStagingDir = patchAndroidExternalNativeBuild(
        updatedAppBuildGradle,
        appExternalNativeBuildBlock,
      );
      const updatedRootBuildGradle = patchRootBuildGradle(
        originalRootBuildGradle,
        libraryGradleBlock,
      );

      await Promise.all([
        updatedAppBuildGradleWithStagingDir !== originalAppBuildGradle
          ? fs.writeFile(appBuildGradlePath, updatedAppBuildGradleWithStagingDir, "utf8")
          : Promise.resolve(),
        updatedRootBuildGradle !== originalRootBuildGradle
          ? fs.writeFile(rootBuildGradlePath, updatedRootBuildGradle, "utf8")
          : Promise.resolve(),
      ]);

      return modConfig;
    },
  ]);
};
