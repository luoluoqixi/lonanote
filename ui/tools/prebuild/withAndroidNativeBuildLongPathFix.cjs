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

function toGradlePath(value) {
  return value.replace(/\\/g, "/");
}

function escapeForGradleString(value) {
  return value.replace(/\\/g, "\\\\");
}

function createExternalNativeBuildBlock({ ninjaPath, objectPathMax }) {
  return [
    "        externalNativeBuild {",
    "            cmake {",
    `                arguments "-DCMAKE_MAKE_PROGRAM=${ninjaPath}", "-DCMAKE_OBJECT_PATH_MAX=${objectPathMax}"`,
    "            }",
    "        }",
  ].join("\n");
}

function createLibraryGradleBlock({ ninjaPath, objectPathMax, targetProjects }) {
  const projectNames = targetProjects.map((name) => `    '${name}',`).join("\n");

  return [
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
    "    def longPathArgs = [",
    // eslint-disable-next-line quotes
    '      "-DCMAKE_MAKE_PROGRAM=${lonanoteLibraryNativeBuildLongPathFix.ninjaPath}",',
    // eslint-disable-next-line quotes
    '      "-DCMAKE_OBJECT_PATH_MAX=${lonanoteLibraryNativeBuildLongPathFix.objectPathMax}",',
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

  if (body.includes("externalNativeBuild {") && body.includes("-DCMAKE_OBJECT_PATH_MAX=")) {
    const updatedBody = body.replace(
      /arguments\s+.*-DCMAKE_MAKE_PROGRAM=[^"]*",\s*"-DCMAKE_OBJECT_PATH_MAX=\d+"/,
      `arguments "-DCMAKE_MAKE_PROGRAM=${block.match(/-DCMAKE_MAKE_PROGRAM=([^"]+)/)[1]}", "-DCMAKE_OBJECT_PATH_MAX=${block.match(/-DCMAKE_OBJECT_PATH_MAX=(\d+)/)[1]}"`,
    );

    return `${content.slice(0, match.index)}${prefix}${updatedBody}${suffix}${content.slice(match.index + match[0].length)}`;
  }

  const trimmedBody = body.replace(/\s+$/, "");
  const updatedBody = `${trimmedBody}\n${block}\n`;
  return `${content.slice(0, match.index)}${prefix}${updatedBody}${suffix}${content.slice(match.index + match[0].length)}`;
}

function patchRootBuildGradle(content, block) {
  if (content.includes("def lonanoteLibraryNativeBuildLongPathFix = [")) {
    return content.replace(
      /def lonanoteLibraryNativeBuildLongPathFix = \[[\s\S]*?^}\n/m,
      `${block}\n`,
    );
  }

  // eslint-disable-next-line quotes
  const anchor = 'apply plugin: "expo-root-project"';
  if (!content.includes(anchor)) {
    throw new Error("Could not find insertion point in android/build.gradle");
  }

  return content.replace(anchor, `${block}\n\n${anchor}`);
}

module.exports = function withAndroidNativeBuildLongPathFix(config) {
  return withFinalizedMod(config, [
    "android",
    async (modConfig) => {
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
