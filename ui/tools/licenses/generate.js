/* eslint-disable no-undef */
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { downloadLicense } from "./download.js";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outputRoot = path.join(projectRoot, "ui/assets/licenses");
const cargoHome = process.env.CARGO_HOME || path.join(os.homedir(), ".cargo");
// 部分开发工具被上游工程放在 dependencies 中，不作为应用直接运行时依赖展示。
const developmentTools = new Set([
  "@trivago/prettier-plugin-sort-imports",
  "eslint",
  "eslint-config-prettier",
  "eslint-plugin-prettier",
  "globals",
  "prettier",
  "typescript-eslint",
  "tailwindcss",
  "expo-build-properties",
]);
const bundledAssets = [
  {
    name: "Fira Code",
    version: "6.2",
    license: "OFL-1.1",
    file: "ui/assets/fonts/fira_code/LICENSE.txt",
  },
];
async function json(file) {
  return JSON.parse(await readFile(file, "utf8"));
}
async function directories(root) {
  try {
    return (await readdir(root, { withFileTypes: true }))
      .filter((d) => d.isDirectory())
      .map((d) => path.join(root, d.name));
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}
async function licenseFiles(root) {
  const files = (await readdir(root))
    .filter((name) => /^(licen[cs]e|copying|copyright|notice|authors)([._-]|$)/i.test(name))
    .sort();
  const documents = [];
  for (const file of files) {
    try {
      const body = await readFile(path.join(root, file), "utf8");
      if (body.trim()) documents.push(`--- ${file} ---\n\n${body}`);
    } catch (error) {
      if (error.code !== "EISDIR") throw error;
    }
  }
  return documents.join("\n\n");
}
export async function npmDependencies(root) {
  const manifest = await json(path.join(root, "package.json"));
  const dependencies = [];
  for (const [name, requirement] of Object.entries(manifest.dependencies ?? {})) {
    if (developmentTools.has(name) || /^workspace:/.test(String(requirement))) continue;
    const installed = path.join(root, "node_modules", name);
    const pkg = await json(path.join(installed, "package.json"));
    dependencies.push({
      name,
      version: pkg.version,
      license: typeof pkg.license === "string" ? pkg.license : "",
      text: await licenseFiles(installed),
      source: "npm",
    });
  }
  return dependencies;
}
/** 只解析应用声明的运行时 dependencies，含 target 条件；不运行 Cargo 或 Git。 */
export async function cargoDependencies(manifest, lock, workspace, home = cargoHome) {
  const declarations = { ...manifest.dependencies };
  for (const target of Object.values(manifest.target ?? {}))
    Object.assign(declarations, target.dependencies);
  const owner = lock.package.find((pkg) => pkg.name === manifest.package.name);
  if (!owner) throw new Error(`Cargo.lock 缺少本地包：${manifest.package.name}`);
  const indexes = await directories(path.join(home, "registry/src"));
  const dependencies = [];
  for (const [alias, value] of Object.entries(declarations)) {
    const declared = value?.workspace ? workspace[alias] : value;
    if (declared?.path) continue;
    const name = declared?.package ?? alias;
    const references = (owner.dependencies ?? []).filter((ref) => ref.split(" ")[0] === name);
    for (const reference of references) {
      const [, version] = reference.split(" ");
      const matches = lock.package.filter(
        (pkg) => pkg.name === name && (!version || pkg.version === version) && pkg.source,
      );
      if (matches.length !== 1) throw new Error(`无法确定 Cargo 直接依赖版本：${name}`);
      const pkg = matches[0];
      let text = "",
        license = "";
      for (const index of indexes) {
        const directory = path.join(index, `${name}-${pkg.version}`);
        try {
          const metadata = Bun.TOML.parse(
            await readFile(path.join(directory, "Cargo.toml"), "utf8"),
          );
          license = typeof metadata.package.license === "string" ? metadata.package.license : "";
          text = await licenseFiles(directory);
          break;
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      dependencies.push({
        name,
        version: pkg.version,
        license,
        text,
        source: "cargo",
        origin: pkg.source,
        checksum: pkg.checksum,
      });
    }
  }
  return dependencies;
}
export function renderDirectLicenses(dependencies) {
  const groups = new Map();
  for (const dependency of dependencies) {
    const key =
      dependency.source === "npm" && dependency.name.startsWith("@codemirror/")
        ? "CodeMirror"
        : dependency.source === "npm" && dependency.name.startsWith("@react-navigation/")
          ? "React Navigation"
          : dependency.name;
    const group = groups.get(key) ?? [];
    group.push(dependency);
    groups.set(key, group);
  }
  return `Third-Party Licenses\n\n${[...groups]
    .sort(([a], [b]) => a.localeCompare(b, "en"))
    .map(([name, members]) => {
      const texts = [...new Set(members.map((member) => member.text).filter(Boolean))];
      return [
        `===== ${name} =====`,
        ...members.map(
          (member) =>
            `${member.source}: ${member.name} ${member.version}${member.license ? ` (${member.license})` : ""}`,
        ),
        "",
        ...texts,
      ].join("\n\n");
    })
    .join("\n\n")}\n`;
}
const additionalMarker = "\n\n===== Additional Third-Party Notices =====\n\n";

/** 补充声明保存在完整文本内；仅更新标记前的直接依赖部分。 */
export async function generateLicenses(dependencies, output = outputRoot) {
  const allFile = path.join(output, "ALL_LICENSES.txt");
  let additional = "";
  try {
    const previous = await readFile(allFile, "utf8");
    if (previous) {
      const index = previous.indexOf(additionalMarker);
      if (index < 0) throw new Error("ALL_LICENSES.txt 缺少补充区分隔标记，已停止生成以保护原文");
      additional = previous.slice(index + additionalMarker.length);
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const unique = [
    ...new Map(
      dependencies.map((dependency) => [
        `${dependency.source}:${dependency.name}:${dependency.version}`,
        dependency,
      ]),
    ).values(),
  ];
  const direct = renderDirectLicenses(unique);
  await mkdir(output, { recursive: true });
  // 先完整写入临时文件，再替换，避免中断时截断唯一的补充声明。
  for (const [name, text] of [
    ["LICENSES.txt", direct],
    ["ALL_LICENSES.txt", direct + additionalMarker + additional],
  ]) {
    const file = path.join(output, name);
    await writeFile(`${file}.tmp`, text);
    await rename(`${file}.tmp`, file);
  }
  return ["LICENSES.txt", "ALL_LICENSES.txt"];
}

export async function generate() {
  const dependencies = [
    ...(await npmDependencies(path.join(projectRoot, "ui"))),
    ...(await npmDependencies(path.join(projectRoot, "ui/assets/editor"))),
  ];
  const workspace = Bun.TOML.parse(await readFile(path.join(projectRoot, "Cargo.toml"), "utf8"));
  const lock = Bun.TOML.parse(await readFile(path.join(projectRoot, "Cargo.lock"), "utf8"));
  for (const file of ["rust/core/Cargo.toml", "rust/utils/Cargo.toml", "ui/src-tauri/Cargo.toml"]) {
    const manifest = Bun.TOML.parse(await readFile(path.join(projectRoot, file), "utf8"));
    dependencies.push(
      ...(await cargoDependencies(manifest, lock, workspace.workspace.dependencies)),
    );
  }
  dependencies.push(
    ...(await cargoDependencies(
      Bun.TOML.parse(
        await readFile(path.join(projectRoot, "ui/rust/crates/lib/Cargo.toml"), "utf8"),
      ),
      Bun.TOML.parse(await readFile(path.join(projectRoot, "ui/rust/Cargo.lock"), "utf8")),
      {},
    )),
  );
  for (const asset of bundledAssets)
    dependencies.push({
      ...asset,
      source: "asset",
      text: await readFile(path.join(projectRoot, asset.file), "utf8"),
    });
  const cacheRoot = path.join(projectRoot, ".temp/license_materials");
  const resolved = new Map();
  for (const dependency of dependencies) {
    if (dependency.text.trim()) continue;
    const identity = `${dependency.source}:${dependency.name}:${dependency.version}:${dependency.origin ?? ""}`;
    try {
      if (!resolved.has(identity)) {
        resolved.set(identity, downloadLicense(dependency, cacheRoot));
      }
      dependency.text = await resolved.get(identity);
    } catch (error) {
      console.warn(`补取失败 ${identity}: ${String(error)}`);
    }
  }
  const missing = [
    ...new Set(
      dependencies
        .filter((dependency) => !dependency.text.trim())
        .map((dependency) => `${dependency.source}:${dependency.name}@${dependency.version}`),
    ),
  ];
  if (missing.length)
    console.warn(
      `以下直接依赖本地及 HTTP 均未取得许可正文，请核对上游准确版本材料：\n${missing.join("\n")}`,
    );
  await generateLicenses(dependencies);
  console.log("已重新生成 LICENSES.txt 与 ALL_LICENSES.txt");
}
if (import.meta.main) await generate();
