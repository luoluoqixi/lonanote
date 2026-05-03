/* eslint-disable quotes */

const fs = require("node:fs/promises");
const path = require("node:path");

const { withFinalizedMod } = require("@expo/config-plugins");

const NINJA_RELATIVE_PATH = path.join("rust", "scripts", "ninja_1.13.2_fix_long_path.exe");
const OBJECT_PATH_MAX = 1024;
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

function createCmakeArguments({ ninjaPath, toolchainFilePathExpression }) {
  return [
    `-DCMAKE_MAKE_PROGRAM=${ninjaPath}`,
    `-DCMAKE_TOOLCHAIN_FILE=${toolchainFilePathExpression}`,
  ];
}

function createExternalNativeBuildBlock({ ninjaPath, objectPathMax }) {
  const argumentsList = createCmakeArguments({
    ninjaPath,
    toolchainFilePathExpression: "${lonanoteToolchainFilePath}",
  })
    .map((argument) => `"${argument}"`)
    .join(", ");

  return [
    "        externalNativeBuild {",
    "            cmake {",
    `                def lonanoteToolchainFilePath = rootProject.ext.lonanoteWriteAndroidToolchainWrapper(android.ndkDirectory, ${objectPathMax})`,
    `                arguments ${argumentsList}`,
    "            }",
    "        }",
  ].join("\n");
}

function createLibraryGradleBlock({ ninjaPath, objectPathMax, targetProjects }) {
  const projectNames = targetProjects.map((name) => `    '${name}',`).join("\n");
  const longPathArgs = createCmakeArguments({
    ninjaPath: "${lonanoteLibraryNativeBuildLongPathFix.ninjaPath}",
    toolchainFilePathExpression: "${lonanoteToolchainFilePath}",
  }).map((argument) => `      "${argument}",`);

  return [
    "def lonanoteWriteAndroidToolchainWrapper = { ndkDirectory, objectPathMax ->",
    "  def lonanoteToolchainDir = new File(rootProject.buildDir, 'lonanote-cmake')",
    "  if (!lonanoteToolchainDir.exists()) {",
    "    lonanoteToolchainDir.mkdirs()",
    "  }",
    "",
    "  def lonanoteNdkToolchainFile = new File(ndkDirectory, 'build/cmake/android.toolchain.cmake')",
    '  def lonanoteWrapperFile = new File(lonanoteToolchainDir, "android.toolchain.wrapper.${objectPathMax}.cmake")',
    "  def lonanoteNdkToolchainPath = lonanoteNdkToolchainFile.absolutePath.replace(File.separatorChar, '/' as char)",
    "",
    '  lonanoteWrapperFile.text = """if(DEFINED LONANOTE_ANDROID_TOOLCHAIN_WRAPPER_INCLUDED)',
    "  return()",
    "endif()",
    "set(LONANOTE_ANDROID_TOOLCHAIN_WRAPPER_INCLUDED TRUE)",
    "",
    'set(CMAKE_OBJECT_PATH_MAX \\"${objectPathMax}\\" CACHE STRING \\"LonaNote object path max\\" FORCE)',
    "",
    'include(\\"${lonanoteNdkToolchainPath}\\")',
    '"""',
    "",
    "  return lonanoteWrapperFile.absolutePath.replace(File.separatorChar, '/' as char)",
    "}",
    "",
    "rootProject.ext.lonanoteWriteAndroidToolchainWrapper = lonanoteWriteAndroidToolchainWrapper",
    "",
    "def lonanoteLibraryNativeBuildLongPathFix = [",
    `  ninjaPath: '${ninjaPath}',`,
    `  objectPathMax: ${objectPathMax},`,
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
    "    def cmake = androidExt?.defaultConfig?.externalNativeBuild?.cmake",
    "    if (cmake == null) {",
    "      return",
    "    }",
    "",
    "    def lonanoteToolchainFilePath = rootProject.ext.lonanoteWriteAndroidToolchainWrapper(androidExt.ndkDirectory, lonanoteLibraryNativeBuildLongPathFix.objectPathMax)",
    "",
    "    def longPathArgs = [",
    ...longPathArgs,
    "    ]",
    "",
    "    longPathArgs.each { arg ->",
    "      if (!cmake.arguments.contains(arg)) {",
    "        cmake.arguments.add(arg)",
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

function patchRootBuildGradle(content, block) {
  const wrapperStart = "def lonanoteWriteAndroidToolchainWrapper = {";
  const anchor = 'apply plugin: "expo-root-project"';

  if (content.includes(wrapperStart)) {
    const startIndex = content.indexOf(wrapperStart);
    const anchorIndex = content.indexOf(anchor);

    if (anchorIndex === -1) {
      throw new Error("Could not find insertion point in android/build.gradle");
    }

    return `${content.slice(0, startIndex)}${block}\n\n${content.slice(anchorIndex)}`;
  }

  if (content.includes("def lonanoteLibraryNativeBuildLongPathFix = [")) {
    return content.replace(
      /def lonanoteLibraryNativeBuildLongPathFix = \[[\s\S]*?^}\n/m,
      `${block}\n`,
    );
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
        objectPathMax: OBJECT_PATH_MAX,
      });
      const libraryGradleBlock = createLibraryGradleBlock({
        ninjaPath: ninjaGradlePath,
        objectPathMax: OBJECT_PATH_MAX,
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
      const updatedRootBuildGradle = patchRootBuildGradle(
        originalRootBuildGradle,
        libraryGradleBlock,
      );

      await Promise.all([
        updatedAppBuildGradle !== originalAppBuildGradle
          ? fs.writeFile(appBuildGradlePath, updatedAppBuildGradle, "utf8")
          : Promise.resolve(),
        updatedRootBuildGradle !== originalRootBuildGradle
          ? fs.writeFile(rootBuildGradlePath, updatedRootBuildGradle, "utf8")
          : Promise.resolve(),
      ]);

      return modConfig;
    },
  ]);
};
