/** 桌面 Dialog 与主窗口共用 Metro；Expo 内部 API 依赖集中在此，升级 Expo 时回归。 */
const fs = require("node:fs/promises");
const path = require("node:path");
const projectRoot = path.resolve(__dirname, "../..");
const manifest = require("../../src/api/common/dialogs/dialog_entry_manifest.json");
const entries = Object.entries(manifest).map(([id, definition]) => ({
  id,
  ...definition,
  name: id.replace(/[.-]/g, "_"),
}));
const entryFor = (item) => ".expo/dialog_entries/" + item.name + ".tsx";

async function generateEntries() {
  const directory = path.join(projectRoot, ".expo/dialog_entries");
  await fs.mkdir(directory, { recursive: true });
  for (const item of entries) {
    const module = "@/api/common/dialogs/" + item.module.slice(2);
    const source =
      "// 自动生成的入口；业务组件仍在 src 中参与 React Compiler 编译。\n" +
      'import "@/initialize";\nimport { registerDialogWindow } from "@/dialog_entry";\n' +
      "import { " +
      item.component +
      " } from " +
      JSON.stringify(module) +
      ";\n" +
      "registerDialogWindow(" +
      JSON.stringify(item.id) +
      ", " +
      item.component +
      ");\n";
    await fs.writeFile(path.join(projectRoot, entryFor(item)), source);
  }
}
const baseUrl = "/_dialog";

function createDialogMiddleware(renderHtml) {
  return async (req, res, next) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    const item = entries.find((item) => pathname === baseUrl + "/" + item.name + ".html");
    if (!item) return next();
    try {
      const html = await renderHtml(item);
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(html);
    } catch (error) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end(`Dialog 入口生成失败：${error}`);
    }
  };
}

async function writeDialogFiles(outputDirectory, files) {
  const target = path.resolve(outputDirectory, "_dialog");
  for (const [filename, data] of files) {
    const destination = path.resolve(target, filename);
    if (!destination.startsWith(`${target}${path.sep}`))
      throw new Error(`Dialog 资源路径越界：${filename}`);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, data.contents);
  }
}

function expoInternals() {
  const cliRoot = path.dirname(require.resolve("@expo/cli/package.json"));
  return (file) => require(path.join(cliRoot, "build/src", file));
}

async function startDialogMetro({
  exporting = false,
  dev = false,
  sourceMaps = false,
  port = 8081,
} = {}) {
  await generateEntries();
  const fromCli = expoInternals();
  const { DevServerManager } = fromCli("start/server/DevServerManager.js");
  const manager = await DevServerManager.startMetroAsync(projectRoot, {
    minify: !dev && !sourceMaps,
    mode: dev ? "development" : "production",
    isExporting: exporting,
    port,
    location: { hostType: "localhost" },
    maxWorkers: 4,
  });
  return { manager, server: manager.getDefaultDevServer(), fromCli };
}

async function attachDialogDevRoute(server) {
  const fromCli = expoInternals();
  const { exp } = require("@expo/config").getConfig(projectRoot);
  const { prependMiddleware } = fromCli("start/server/middleware/mutations.js");
  const { createBundleUrlPath } = fromCli("start/server/middleware/metroOptions.js");
  const { createTemplateHtmlFromExpoConfigAsync } = fromCli("start/server/webTemplate.js");
  const { serializeHtmlWithAssets } = fromCli("start/server/metro/serializeHtml.js");
  prependMiddleware(
    server.getInstance().middleware,
    createDialogMiddleware(async (item) => {
      const entry = entryFor(item);
      const resources = await server.getStaticResourcesAsync({
        mainModuleName: `./${entry}`,
        includeSourceMaps: false,
      });
      const template = await createTemplateHtmlFromExpoConfigAsync(projectRoot, {
        scripts: [],
        cssLinks: [],
        exp,
      });
      const devBundleUrl = createBundleUrlPath({
        ...server.instanceMetroOptions,
        mainModuleName: entry.replace(/\.tsx$/, ""),
        platform: "web",
        environment: "client",
        lazy: true,
        bytecode: false,
      });
      return serializeHtmlWithAssets({
        isExporting: false,
        resources: resources.artifacts,
        template,
        baseUrl: "",
        devBundleUrl,
      });
    }),
  );
}

async function exportDialog({ dev = false, sourceMaps = false, port = 8081 } = {}) {
  const { manager, server, fromCli } = await startDialogMetro({
    exporting: true,
    dev,
    sourceMaps,
    port,
  });
  try {
    const { exp } = require("@expo/config").getConfig(projectRoot);
    const files = new Map();
    const metrics = {};
    for (const item of entries) {
      const entry = entryFor(item);
      const resources = await server.nativeExportBundleAsync(
        exp,
        {
          platform: "web",
          splitChunks: !dev,
          mainModuleName: entry,
          baseUrl,
          mode: dev ? "development" : "production",
          minify: !dev && !sourceMaps,
          serializerIncludeMaps: sourceMaps,
          bytecode: false,
          reactCompiler: !!exp.experiments?.reactCompiler,
        },
        new Map(),
      );
      const entryFiles = new Map();
      fromCli("export/saveAssets.js").getFilesFromSerialAssets(resources.artifacts, {
        files: entryFiles,
        platform: "web",
        includeSourceMaps: sourceMaps,
        isServerHosted: true,
      });
      await fromCli("export/persistMetroAssets.js").persistMetroAssetsAsync(
        projectRoot,
        resources.assets,
        {
          files: entryFiles,
          platform: "web",
          outputDirectory: path.join(projectRoot, "dist/_dialog"),
          baseUrl,
        },
      );
      const template = await fromCli(
        "start/server/webTemplate.js",
      ).createTemplateHtmlFromExpoConfigAsync(projectRoot, { scripts: [], cssLinks: [], exp });
      const html = fromCli("start/server/metro/serializeHtml.js").serializeHtmlWithAssets({
        isExporting: true,
        resources: resources.artifacts,
        template,
        baseUrl,
      });
      entryFiles.set(item.name + ".html", { contents: html });
      for (const [name, value] of entryFiles) {
        const previous = files.get(name);
        if (previous && !Buffer.from(previous.contents).equals(Buffer.from(value.contents)))
          throw new Error("Dialog 资源名称冲突：" + name);
        files.set(name, value);
      }
      metrics[item.id] = resources.artifacts.map((asset) => ({
        filename: asset.filename,
        type: asset.type,
        bytes: Buffer.byteLength(asset.source),
        isAsync: !!asset.metadata?.isAsync,
        requires: asset.metadata?.requires ?? [],
        modules:
          asset.metadata?.modulePaths?.map((file) =>
            path.relative(projectRoot, file).replaceAll("\\", "/"),
          ) ?? [],
      }));
    }
    await writeDialogFiles(path.join(projectRoot, "dist"), files);
    await fs.mkdir(path.join(projectRoot, ".expo"), { recursive: true });
    await fs.writeFile(
      path.join(projectRoot, ".expo/dialog_build_metrics.json"),
      JSON.stringify(metrics, null, 2),
    );
    console.log(`Dialog 独立入口已导出：dist/_dialog/*.html（${files.size} 个资源）`);
  } finally {
    await manager.stopAsync();
  }
}

async function main() {
  process.chdir(projectRoot);
  const devServer = process.argv[2] === "dev";
  const dev = devServer || process.argv.includes("--dev");
  process.env.NODE_ENV = dev ? "development" : "production";
  process.env.APP_MODE = devServer ? "development" : "production";
  if (process.argv.includes("--ci")) process.env.CI = "1";
  if (!devServer && !dev) {
    // 只在这个独立子进程开启，主入口和移动端保持原构建策略。
    process.env.EXPO_UNSTABLE_TREE_SHAKING = "1";
    process.env.EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH = "1";
  }
  const port = Number(process.env.LONANOTE_METRO_PORT ?? 8081);
  if (!devServer)
    return exportDialog({ dev, sourceMaps: process.argv.includes("--sourcemap"), port });
  const { manager, server } = await startDialogMetro({ dev: true, port });
  await attachDialogDevRoute(server);
  console.log(`Metro 主入口：http://localhost:${port}/；Dialog：${baseUrl}/settings.html`);
  let stopping = false;
  const stop = async () => {
    if (stopping) return;
    stopping = true;
    await manager.stopAsync();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

module.exports = {
  createDialogMiddleware,
  writeDialogFiles,
  attachDialogDevRoute,
  startDialogMetro,
};
if (require.main === module)
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
