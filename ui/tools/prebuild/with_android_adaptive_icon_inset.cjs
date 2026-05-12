const fs = require("node:fs/promises");
const path = require("node:path");

const { withFinalizedMod } = require("@expo/config-plugins");

const ICON_XML_FILES = ["ic_launcher.xml", "ic_launcher_round.xml"];

function patchAdaptiveIconXml(content, inset) {
  const foregroundMatch = content.match(/<foreground android:drawable="([^"]+)"\s*\/>/);

  if (foregroundMatch) {
    const drawableRef = foregroundMatch[1];
    return content.replace(
      /<foreground android:drawable="[^"]+"\s*\/>/,
      [
        "<foreground>",
        `        <inset android:drawable="${drawableRef}" android:inset="${inset}" />`,
        "    </foreground>",
      ].join("\n"),
    );
  }

  if (content.includes("<foreground>") && content.includes("<inset ")) {
    return content.replace(/android:inset="[^"]+"/, `android:inset="${inset}"`);
  }

  return content;
}

module.exports = function withAndroidAdaptiveIconInset(config, props = {}) {
  const inset = props.inset ?? "16%";

  return withFinalizedMod(config, [
    "android",
    async (modConfig) => {
      const resourceDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "mipmap-anydpi-v26",
      );

      await Promise.all(
        ICON_XML_FILES.map(async (fileName) => {
          const filePath = path.join(resourceDir, fileName);

          try {
            const original = await fs.readFile(filePath, "utf8");
            const updated = patchAdaptiveIconXml(original, inset);

            if (updated !== original) {
              await fs.writeFile(filePath, updated, "utf8");
            }
          } catch (error) {
            if (error && error.code === "ENOENT") {
              return;
            }

            throw error;
          }
        }),
      );

      return modConfig;
    },
  ]);
};
