const fs = require("fs");
const path = require("path");
const { transform: lightningCssTransform } = require("lightningcss");
const { collectCssImports } = require("@expo/metro-config/build/transform-worker/css-modules");
const uniwindTransform = require("../node_modules/uniwind/dist/metro/metro-transformer.cjs");

const CSS_EXTENSION = ".css";
const WEB_CSS_EXTENSION = ".web.css";
const LOCAL_IMPORT_PREFIXES = [".", "/"];

let cachedCssEntryFile = null;

const resolveCSSEntryFile = (config, options) => {
  if (cachedCssEntryFile === null) {
    cachedCssEntryFile = config.uniwind.cssEntryFile;
  }

  if (options.platform === "web") {
    const cssIndex = cachedCssEntryFile.lastIndexOf(CSS_EXTENSION);
    return `${cachedCssEntryFile.substring(0, cssIndex)}${WEB_CSS_EXTENSION}`;
  }

  return cachedCssEntryFile;
};

const isLocalCssDependency = (dependencyName) => {
  return LOCAL_IMPORT_PREFIXES.some((prefix) => dependencyName.startsWith(prefix));
};

const isTrackedCssEntryFile = ({ projectRoot, filePath, cssEntryFilePath, options }) => {
  if (options.type === "asset") {
    return false;
  }

  return path.resolve(projectRoot, filePath) === path.resolve(projectRoot, cssEntryFilePath);
};

const shouldAppendCssDependencies = ({ projectRoot, filePath, cssEntryFilePath, options }) => {
  return (
    options.platform === "web" &&
    options.dev === true &&
    isTrackedCssEntryFile({ projectRoot, filePath, cssEntryFilePath, options })
  );
};

const collectDirectCssDependencies = ({ cssPath, projectRoot }) => {
  const source = fs.readFileSync(cssPath, "utf-8");
  const analysis = lightningCssTransform({
    filename: cssPath,
    code: Buffer.from(source),
    errorRecovery: true,
    sourceMap: false,
    cssModules: false,
    projectRoot,
    minify: false,
    analyzeDependencies: true,
    include: 1,
  });

  const { dependencies } = collectCssImports(cssPath, source, analysis.code.toString(), analysis);
  return dependencies.filter((dependency) => isLocalCssDependency(dependency.name));
};

const mergeDependencies = (baseDependencies, extraDependencies) => {
  const merged = [...baseDependencies];
  const seen = new Set(baseDependencies.map((dependency) => dependency.name));

  for (const dependency of extraDependencies) {
    if (seen.has(dependency.name)) {
      continue;
    }
    seen.add(dependency.name);
    merged.push(dependency);
  }

  return merged;
};

const transform = async (config, projectRoot, filePath, data, options) => {
  const resolvedCssEntryFile = resolveCSSEntryFile(config, options);
  config.uniwind.cssEntryFile = resolvedCssEntryFile;

  const result = await uniwindTransform.transform(config, projectRoot, filePath, data, options);

  if (
    !shouldAppendCssDependencies({
      projectRoot,
      filePath,
      cssEntryFilePath: resolvedCssEntryFile,
      options,
    })
  ) {
    return result;
  }

  const cssPath = path.resolve(projectRoot, resolvedCssEntryFile);
  const cssDependencies = collectDirectCssDependencies({ cssPath, projectRoot });

  if (cssDependencies.length === 0) {
    return result;
  }

  return {
    ...result,
    dependencies: mergeDependencies(result.dependencies, cssDependencies),
  };
};

exports.transform = transform;
