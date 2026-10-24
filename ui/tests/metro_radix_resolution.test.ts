import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const config = require("../metro.config.js");
const { resolve } = require("metro-resolver");
const appRoot = path.resolve(import.meta.dir, "..");

function getPackageForModule(modulePath: string) {
  let directory =
    fs.existsSync(modulePath) && fs.statSync(modulePath).isDirectory()
      ? modulePath
      : path.dirname(modulePath);
  while (directory !== path.dirname(directory)) {
    if (path.basename(directory) === "node_modules") return null;
    const manifest = path.join(directory, "package.json");
    if (fs.existsSync(manifest)) {
      return {
        rootPath: directory,
        packageJson: JSON.parse(fs.readFileSync(manifest, "utf8")),
        packageRelativePath: path.relative(directory, modulePath),
      };
    }
    directory = path.dirname(directory);
  }
  return null;
}

// 使用真实 Metro resolver 和已安装依赖，覆盖顶层旧版本遮蔽包内新版本的情况。
function resolveFrom(originModulePath: string, moduleName: string) {
  const warnings: string[] = [];
  const context = {
    ...config.resolver,
    originModulePath,
    resolveRequest: resolve,
    assetExts: new Set(config.resolver.assetExts),
    mainFields: config.resolver.resolverMainFields,
    dev: true,
    isESMImport: true,
    preferNativePlatform: false,
    customResolverOptions: {},
    doesFileExist: fs.existsSync,
    fileSystemLookup(filePath: string) {
      if (!fs.existsSync(filePath)) return { exists: false };
      return {
        exists: true,
        type: fs.statSync(filePath).isDirectory() ? "d" : "f",
        realPath: fs.realpathSync(filePath),
      };
    },
    getPackage(filePath: string) {
      return JSON.parse(fs.readFileSync(filePath, "utf8"));
    },
    getPackageForModule,
    redirectModulePath: (filePath: string) => filePath,
    resolveAsset: () => null,
    unstable_logWarning: (message: string) => warnings.push(message),
  };
  const result = config.resolver.resolveRequest(context, moduleName, "web");
  expect(warnings).toEqual([]);
  return result.filePath as string;
}

test("Metro 能从菜单依赖解析 primitive 的 is-development 导出", () => {
  for (const name of ["react-context-menu", "react-dropdown-menu", "react-menu"]) {
    const origin = require.resolve(`@radix-ui/${name}`);
    const result = resolveFrom(origin, "@radix-ui/primitive/is-development");
    expect(fs.existsSync(result)).toBe(true);
    expect(fs.readFileSync(result, "utf8")).toContain("IS_DEVELOPMENT");
  }
});

test("Metro 为 Popover 选择其声明的 DismissableLayer 版本", () => {
  const origin = require.resolve("@radix-ui/react-popover");
  const expected =
    getPackageForModule(origin)!.packageJson.dependencies["@radix-ui/react-dismissable-layer"];
  const result = resolveFrom(origin, "@radix-ui/react-dismissable-layer");
  expect(getPackageForModule(result)!.packageJson.version).toBe(expected);
});

test("Radix 内的 React 和 React Navigation 仍共享应用依赖", () => {
  for (const origin of [
    require.resolve("@radix-ui/react-context-menu"),
    require.resolve("expo-router/entry"),
    require.resolve("rn-ui-kit"),
  ]) {
    for (const name of ["react", "@react-navigation/native"]) {
      expect(resolveFrom(origin, name)).toBe(resolveFrom(path.join(appRoot, "package.json"), name));
    }
  }
});

test("菜单与 Dialog 的完整 Radix 依赖链符合包声明的精确版本", () => {
  const pending = [
    "react-dialog",
    "react-popover",
    "react-context-menu",
    "react-dropdown-menu",
    "react-tabs",
  ].map((name) => require.resolve(`@radix-ui/${name}`));
  const visited = new Set<string>();
  while (pending.length) {
    const origin = pending.pop()!;
    if (visited.has(origin)) continue;
    visited.add(origin);
    const manifest = getPackageForModule(origin)!.packageJson;
    for (const [dependency, version] of Object.entries(manifest.dependencies ?? {})) {
      if (!dependency.startsWith("@radix-ui/")) continue;
      const result = resolveFrom(origin, dependency);
      const actual = getPackageForModule(result)!.packageJson;
      expect(`${manifest.name} → ${dependency}@${actual.version}`).toBe(
        `${manifest.name} → ${dependency}@${version}`,
      );
      pending.push(result);
    }
  }
});

test("Dialog、Popover 和菜单共用焦点及弹层实例，菜单与 RN primitive 共用 Context", () => {
  const origins = ["react-dialog", "react-popover", "react-menu"].map((name) =>
    require.resolve(`@radix-ui/${name}`),
  );
  for (const name of ["react-focus-scope", "react-dismissable-layer", "react-focus-guards"]) {
    const results = origins.map((origin) => resolveFrom(origin, `@radix-ui/${name}`));
    expect(new Set(results).size).toBe(1);
  }
  for (const name of ["context-menu", "dropdown-menu"]) {
    expect(resolveFrom(require.resolve(`@rn-primitives/${name}`), `@radix-ui/react-${name}`)).toBe(
      resolveFrom(path.join(appRoot, "package.json"), `@radix-ui/react-${name}`),
    );
  }
});
