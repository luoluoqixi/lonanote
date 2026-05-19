const uniwindTransform = require("../node_modules/uniwind/dist/metro/metro-transformer.cjs");

let cssEntryFile = null;

const resolveCSSEntryFile = (config, options) => {
  if (cssEntryFile === null) {
    cssEntryFile = config.uniwind.cssEntryFile;
  }
  if (options.platform === "web") {
    const cssIndex = cssEntryFile.lastIndexOf(".css");
    const filePath = `${cssEntryFile.substring(0, cssIndex)}.web.css`;
    // console.log("cssEntryFile:", filePath);
    return filePath;
  }
  return cssEntryFile;
};

const transform = async (config, projectRoot, filePath, data, options) => {
  config.uniwind.cssEntryFile = resolveCSSEntryFile(config, options);
  return uniwindTransform.transform(config, projectRoot, filePath, data, options);
};

exports.transform = transform;
