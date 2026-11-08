/* eslint-disable no-undef */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const legalName = /^(licen[cs]e|copying|copyright|notice|authors)([._-]|$)/i;
const shared = new Map();
async function httpGet(url) {
  return fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "User-Agent": "LonaNote-License-Generator" },
  });
}
function githubRepository(repository) {
  const match = repository.match(
    /^(?:git\+)?https:\/\/github\.com\/([^/]+)\/([^/#?]+?)(?:\.git)?(?:[?#].*)?$/,
  );
  return match ? `${match[1]}/${match[2]}` : null;
}
async function archiveLicenses(bytes, source, get) {
  let metadata, vcs;
  const files = await new Bun.Archive(bytes).files();
  const texts = [];
  const selected = new Set();
  // 除包根目录的许可，还保留 Cargo.toml 中显式指定的 license-file。
  for (const [name, file] of files) {
    if (!/^[^/]+\/Cargo.toml$/.test(name)) continue;
    metadata = Bun.TOML.parse(await file.text());
    if (typeof metadata.package?.["license-file"] === "string")
      selected.add(
        path.posix.normalize(`${name.split("/")[0]}/${metadata.package["license-file"]}`),
      );
  }
  for (const [name, file] of [...files].sort(([a], [b]) => a.localeCompare(b, "en"))) {
    const parts = name.split("/");
    if (!(parts.length === 2 && legalName.test(parts[1])) && !selected.has(name)) continue;
    const body = await file.text();
    if (body.trim()) texts.push(`Source: ${source}\n--- ${name} ---\n\n${body}`);
  }
  if (texts.length) return texts.join("\n\n");
  for (const [name, file] of files) {
    if (/^[^/]+\/\.cargo_vcs_info.json$/.test(name)) vcs = JSON.parse(await file.text());
  }
  // 少数 crate 没有打包 LICENSE，沿已校验发布包自带的 commit 查找仓库原文。
  if (typeof metadata?.package?.repository === "string" && vcs?.git?.sha1) {
    return repositoryLicenses(
      metadata.package.repository,
      vcs.git.sha1,
      vcs.path_in_vcs ?? "",
      get,
    );
  }
  return "";
}
async function responseText(url, get) {
  if (get !== httpGet) {
    const response = await get(url);
    return { status: response.status, body: await response.text() };
  }
  if (!shared.has(url))
    shared.set(
      url,
      get(url).then(async (response) => ({ status: response.status, body: await response.text() })),
    );
  return shared.get(url);
}
async function repositoryLicenses(repository, revision, directory, get) {
  const repo = githubRepository(repository);
  if (!repo || !/^[a-f0-9]{40}$/i.test(revision)) return "";
  const pieces = directory.split("/").filter(Boolean);
  if (pieces.some((part) => part === "." || part === "..")) return "";
  // 使用官方 contents/blob API，按准确 commit 读取，不依赖 raw 域名或默认分支。
  for (let length = pieces.length; length >= 0; length--) {
    const prefix = pieces.slice(0, length).map(encodeURIComponent).join("/");
    const url = `https://api.github.com/repos/${repo}/contents/${prefix}?ref=${revision}`;
    const listing = await responseText(url, get);
    if (listing.status === 404) continue;
    if (listing.status !== 200) throw new Error(`HTTP ${listing.status}: ${url}`);
    const files = JSON.parse(listing.body);
    if (!Array.isArray(files)) throw new Error(`GitHub 目录响应无效：${url}`);
    const texts = [];
    for (const file of files
      .filter((file) => file.type === "file" && legalName.test(file.name))
      .sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      if (!/^[a-f0-9]{40}$/i.test(file.sha)) throw new Error("GitHub 文件身份无效");
      const blobUrl = `https://api.github.com/repos/${repo}/git/blobs/${file.sha}`;
      const result = await responseText(blobUrl, get);
      if (result.status !== 200) throw new Error(`HTTP ${result.status}: ${blobUrl}`);
      const blob = JSON.parse(result.body);
      if (blob.encoding !== "base64" || typeof blob.content !== "string")
        throw new Error(`GitHub 文件响应无效：${blobUrl}`);
      const body = Buffer.from(blob.content, "base64").toString("utf8");
      if (body.trim())
        texts.push(
          `Source: https://api.github.com/repos/${repo}/contents/${prefix ? `${prefix}/` : ""}${encodeURIComponent(file.name)}?ref=${revision}\n--- ${file.name} ---\n\n${body}`,
        );
    }
    if (texts.length) return texts.join("\n\n");
  }
  return "";
}
/** 本地缺失时才下载准确版本；下载原文缓存到忽略提交的临时目录，不生成审计报告。 */
export async function downloadLicense(dependency, cacheRoot, get = httpGet) {
  const revision = dependency.origin?.startsWith("git+") ? dependency.origin.split("#")[1] : "";
  if (
    dependency.source === "cargo" &&
    !revision &&
    dependency.origin !== "registry+https://github.com/rust-lang/crates.io-index" &&
    dependency.origin !== "sparse+https://index.crates.io/"
  )
    return "";
  const identity = `${dependency.source}-${dependency.name.replace(/[/\\]/g, "-")}-${dependency.version}`;
  if (!/^[a-zA-Z0-9@._+ -]+$/.test(identity) || (revision && !/^[a-f0-9]{40}$/i.test(revision)))
    throw new Error("下载缓存身份无效");
  const cache = path.join(cacheRoot, identity, revision || "registry", "LICENSE.txt");
  try {
    return await readFile(cache, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  if (get === httpGet)
    console.log(`HTTP 下载许可：${dependency.source}:${dependency.name}@${dependency.version}`);
  let text = "";
  if (dependency.source === "cargo") {
    if (revision) {
      text = await repositoryLicenses(dependency.origin.replace(/^git\+/, ""), revision, "", get);
    } else if (
      dependency.origin === "registry+https://github.com/rust-lang/crates.io-index" ||
      dependency.origin === "sparse+https://index.crates.io/"
    ) {
      const url = `https://static.crates.io/crates/${encodeURIComponent(dependency.name)}/${encodeURIComponent(dependency.name)}-${encodeURIComponent(dependency.version)}.crate`;
      const response = await get(url);
      if (response.status === 404) return "";
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (
        !dependency.checksum ||
        createHash("sha256").update(bytes).digest("hex") !== dependency.checksum
      )
        throw new Error(`Cargo 下载包校验失败：${dependency.name}@${dependency.version}`);
      text = await archiveLicenses(bytes, url, get);
    }
  } else if (dependency.source === "npm") {
    const url = `https://registry.npmjs.org/${encodeURIComponent(dependency.name)}/${encodeURIComponent(dependency.version)}`;
    const response = await get(url);
    if (response.status === 404) return "";
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
    const metadata = await response.json();
    if (metadata.name !== dependency.name || metadata.version !== dependency.version)
      throw new Error("npm 下载版本不匹配");
    const repository =
      typeof metadata.repository === "string" ? metadata.repository : metadata.repository?.url;
    if (repository && metadata.gitHead)
      text = await repositoryLicenses(
        repository,
        metadata.gitHead,
        metadata.repository?.directory ?? "",
        get,
      );
  }
  if (text) {
    await mkdir(path.dirname(cache), { recursive: true });
    await writeFile(cache, text);
  }
  return text;
}
