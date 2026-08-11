const fs = require("node:fs/promises");
const path = require("node:path");

const { withFinalizedMod } = require("@expo/config-plugins");

const MENU_RESOURCE_GROUPS = [
  {
    directory: "drawable",
    sourceDirectory: ".",
    fileNames: [
      "ic_workspace_select.xml",
      "ic_workspace_create.xml",
      "ic_workspace_sort.xml",
      "ic_workspace_settings.xml",
    ],
  },
  {
    directory: "values",
    fileNames: ["workspace_menu_icon_colors.xml"],
  },
  {
    directory: "values-night",
    fileNames: ["workspace_menu_icon_colors.xml"],
  },
];

module.exports = function withAndroidMenuIcons(config) {
  return withFinalizedMod(config, [
    "android",
    async (modConfig) => {
      const sourceDir = path.join(
        modConfig.modRequest.projectRoot,
        "assets",
        "android",
        "menu_icons",
      );
      await Promise.all(
        MENU_RESOURCE_GROUPS.map(async ({ directory, fileNames, sourceDirectory = directory }) => {
          const targetDir = path.join(
            modConfig.modRequest.platformProjectRoot,
            "app",
            "src",
            "main",
            "res",
            directory,
          );

          await fs.mkdir(targetDir, { recursive: true });

          await Promise.all(
            fileNames.map(async (fileName) => {
              const targetPath = path.join(targetDir, fileName);
              const [source, current] = await Promise.all([
                fs.readFile(path.join(sourceDir, sourceDirectory, fileName), "utf8"),
                fs.readFile(targetPath, "utf8").catch(() => null),
              ]);

              if (current !== source) {
                await fs.writeFile(targetPath, source, "utf8");
              }
            }),
          );
        }),
      );

      return modConfig;
    },
  ]);
};
