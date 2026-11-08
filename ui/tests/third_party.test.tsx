import { afterEach, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import React, { act } from "react";

import { licenseTextBlocks } from "../src/components/settings/licenses_model";
import { settingsNavigation } from "../src/components/settings/settings_navigation";
import {
  cargoDependencies,
  generateLicenses,
  npmDependencies,
} from "../tools/licenses/generate.js";

// UI mock 在隔离进程执行，避免污染完整测试集；所有许可回归只保留本文件。
if (process.env.LONANOTE_LICENSE_UI_TEST === "1") {
  const win = new Window();
  for (const key of [
    "window",
    "document",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "MouseEvent",
    "ShadowRoot",
  ])
    globalThis[key] = key === "window" ? win : win[key];
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const { createRoot } = await import("react-dom/client");
  const rn = await import("react-native-web");
  mock.module("react-native", () => rn);
  mock.module("rn-ui-kit", () => ({
    Text: rn.Text,
    Button: ({ onPress, children, ...props }) => (
      <rn.Pressable accessibilityRole="button" onPress={onPress} {...props}>
        <rn.Text>{children}</rn.Text>
      </rn.Pressable>
    ),
  }));
  const direct = "Direct licenses\nCopyright Example\r\n<script>text only</script>\n";
  const all = direct + "\nAll licenses\nCopyright Indirect\n" + "License text\n".repeat(2000);
  let copied = "",
    failCopy = false,
    error: string | null = null;
  const messages: string[] = [];
  mock.module("../src/api/commands/system", () => ({
    clipboard: {
      writeText: async (text) => {
        if (failCopy) throw new Error("denied");
        copied = text;
      },
    },
  }));
  mock.module("../src/hooks/ui", () => ({
    useToast: () => ({ toast: { info: (m) => messages.push(m), error: (m) => messages.push(m) } }),
  }));
  mock.module("../src/hooks/settings/use_license_text", () => ({
    useLicenseText: (scope) => ({
      text: error ? "" : scope === "direct" ? direct : all,
      error,
      loading: false,
    }),
  }));
  const { LicensesSettingsPage } =
    await import("../src/components/settings/pages/licenses_settings_page");
  test("UI 仅显示两份原文，切换复制准确，错误可见且 HTML 不执行", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const button = (label: string) =>
      [...host.querySelectorAll('[role="button"]')].find((node) => node.textContent === label)!;
    try {
      await act(() => root.render(<LicensesSettingsPage />));
      expect(host.textContent).toContain(direct);
      expect(host.textContent).not.toContain("Copyright Indirect");
      expect(host.querySelector("script")).toBeNull();
      await act(async () => {
        button("复制文本").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
      });
      expect(copied).toBe(direct);
      await act(() =>
        button("全部依赖许可").dispatchEvent(new win.MouseEvent("click", { bubbles: true })),
      );
      expect(host.textContent).toContain("Copyright Indirect");
      await act(async () => {
        button("复制文本").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
      });
      expect(copied).toBe(all);
      failCopy = true;
      messages.length = 0;
      await act(async () => {
        button("复制文本").dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
        await Promise.resolve();
      });
      expect(messages).toEqual(["复制失败"]);
      error = "读取开源许可失败";
      await act(() =>
        button("直接依赖许可").dispatchEvent(new win.MouseEvent("click", { bubbles: true })),
      );
      expect(host.textContent).toContain(error);
      expect(host.querySelector("input")).toBeNull();
    } finally {
      await act(() => root.unmount());
      host.remove();
    }
  });
} else {
  const roots: string[] = [];
  afterEach(async () => {
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });
  test("自动读取直接 npm 依赖，跳过开发和 workspace 包，保留 LICENSE 和 NOTICE", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "license-generation-"));
    roots.push(root);
    await mkdir(path.join(root, "node_modules/example"), { recursive: true });
    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        dependencies: { example: "^1", own: "workspace:*" },
        devDependencies: { tool: "1" },
      }),
    );
    await writeFile(
      path.join(root, "node_modules/example/package.json"),
      JSON.stringify({ name: "example", version: "1.2.0", license: "MIT" }),
    );
    const body = "Copyright Author\r\nFull LICENSE\n";
    await writeFile(path.join(root, "node_modules/example/LICENSE"), body);
    await writeFile(path.join(root, "node_modules/example/NOTICE"), "Original Notice");
    const dependencies = await npmDependencies(root);
    expect(dependencies).toHaveLength(1);
    expect(dependencies[0].version).toBe("1.2.0");
    expect(dependencies[0].text).toContain(body);
    expect(dependencies[0].text).toContain("Original Notice");
  });
  test("Cargo 直接依赖按锁文件解析，涵盖 target 和 workspace，排除 build/dev/path", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "license-cargo-"));
    roots.push(root);
    await mkdir(path.join(root, "registry/src/index/serde-1.0.1"), { recursive: true });
    await mkdir(path.join(root, "registry/src/index/windows-2.0.0"), { recursive: true });
    for (const [name, version] of [
      ["serde", "1.0.1"],
      ["windows", "2.0.0"],
    ]) {
      await writeFile(
        path.join(root, `registry/src/index/${name}-${version}/Cargo.toml`),
        `[package]\nname="${name}"\nversion="${version}"\nlicense="MIT"\n`,
      );
      await writeFile(
        path.join(root, `registry/src/index/${name}-${version}/LICENSE`),
        `Copyright ${name}`,
      );
    }
    const manifest = `[package]\nname="app"\n[dependencies]\nserde={workspace=true}\nowned={path="../owned"}\n[build-dependencies]\ntool="1"\n[dev-dependencies]\ntestlib="1"\n[target.'cfg(windows)'.dependencies]\nwindows="2"\n`;
    const lock = {
      package: [
        {
          name: "app",
          version: "1",
          dependencies: ["serde", "windows", "owned", "tool", "testlib"],
        },
        { name: "serde", version: "1.0.1", source: "registry+x" },
        { name: "windows", version: "2.0.0", source: "registry+x" },
        { name: "tool", version: "1", source: "registry+x" },
      ],
    };
    const dependencies = await cargoDependencies(
      Bun.TOML.parse(manifest),
      lock,
      { serde: "1" },
      root,
    );
    expect(dependencies.map((d) => d.name).sort()).toEqual(["serde", "windows"]);
    expect(dependencies.every((d) => d.text.includes("Copyright"))).toBe(true);
  });
  test("生成两份 TXT，重跑原样保留完整文本补充区，损坏的分隔行不会被覆盖", async () => {
    const root = await mkdtemp(path.join(os.tmpdir(), "license-output-"));
    roots.push(root);
    const marker = "\n\n===== Additional Third-Party Notices =====\n\n";
    const preserved = "历史原文\r\nCopyright Author\n" + marker + "手工追加的完整上游声明\r\n";
    const dependencies = [
      { name: "Example", version: "1", license: "MIT", text: "Copyright Example\n", source: "npm" },
    ];
    await writeFile(path.join(root, "ALL_LICENSES.txt"), "旧的直接依赖正文" + marker + preserved);
    const files = await generateLicenses(dependencies, root);
    expect(files.sort()).toEqual(["ALL_LICENSES.txt", "LICENSES.txt"]);
    const direct = await readFile(path.join(root, "LICENSES.txt"), "utf8");
    const complete = await readFile(path.join(root, "ALL_LICENSES.txt"), "utf8");
    expect(direct).toContain("Copyright Example\n");
    expect(complete).toBe(direct + marker + preserved);
    await writeFile(path.join(root, "LICENSES.txt"), "stale");
    await generateLicenses(dependencies, root);
    expect(await readFile(path.join(root, "LICENSES.txt"), "utf8")).toBe(direct);
    expect(await readFile(path.join(root, "ALL_LICENSES.txt"), "utf8")).toBe(complete);
    await writeFile(path.join(root, "ALL_LICENSES.txt"), "分隔行被意外删除，仍需保留的声明");
    await expect(generateLicenses(dependencies, root)).rejects.toThrow("分隔");
    expect(await readFile(path.join(root, "ALL_LICENSES.txt"), "utf8")).toBe(
      "分隔行被意外删除，仍需保留的声明",
    );
  });

  test("缺少 Cargo 本地源码时按准确版本 HTTP 下载，校验锁定包并复用临时缓存", async () => {
    const { downloadLicense } = await import("../tools/licenses/download.js");
    const { createHash } = await import("node:crypto");
    const root = await mkdtemp(path.join(os.tmpdir(), "license-http-"));
    roots.push(root);
    const bytes = await new Bun.Archive(
      {
        "example-1.2.3/LICENSE": "Copyright Exact Version\r\n",
        "example-1.2.3/NOTICE": "Original NOTICE",
      },
      { compress: "gzip" },
    ).bytes();
    const dependency = {
      name: "example",
      version: "1.2.3",
      source: "cargo",
      license: "MIT",
      text: "",
      origin: "registry+https://github.com/rust-lang/crates.io-index",
      checksum: createHash("sha256").update(bytes).digest("hex"),
    };
    const urls: string[] = [];
    const get = async (url: string) => {
      urls.push(url);
      return new Response(bytes);
    };
    const first = await downloadLicense(dependency, root, get);
    expect(first).toContain("Copyright Exact Version\r\n");
    expect(first).toContain("Original NOTICE");
    expect(first).toContain("https://static.crates.io/crates/example/example-1.2.3.crate");
    expect(await downloadLicense(dependency, root, get)).toBe(first);
    expect(urls).toEqual(["https://static.crates.io/crates/example/example-1.2.3.crate"]);
    await expect(
      downloadLicense({ ...dependency, checksum: "wrong" }, path.join(root, "invalid"), get),
    ).rejects.toThrow("校验");
    const revision = "a".repeat(40);
    const archive = await new Bun.Archive(
      {
        "example-1.2.3/Cargo.toml":
          '[package]\nname="example"\nrepository="https://github.com/owner/project"\n',
        "example-1.2.3/.cargo_vcs_info.json": JSON.stringify({
          git: { sha1: revision },
          path_in_vcs: "",
        }),
      },
      { compress: "gzip" },
    ).bytes();
    const fromRepo = await downloadLicense(
      { ...dependency, checksum: createHash("sha256").update(archive).digest("hex") },
      path.join(root, "repository"),
      async (url) => {
        if (url.endsWith(".crate")) return new Response(archive);
        if (url.includes("/contents/"))
          return Response.json([{ type: "file", name: "LICENSE", sha: "b".repeat(40) }]);
        return Response.json({
          encoding: "base64",
          content: Buffer.from("Copyright Repository Author").toString("base64"),
        });
      },
    );
    expect(fromRepo).toContain("Copyright Repository Author");
    expect(fromRepo).toContain(`ref=${revision}`);
  });
  test("npm 缺失正文时只取准确版本 gitHead，下载失败不替换为最新分支或许可模板", async () => {
    const { downloadLicense } = await import("../tools/licenses/download.js");
    const root = await mkdtemp(path.join(os.tmpdir(), "license-npm-http-"));
    roots.push(root);
    const revision = "a".repeat(40);
    const urls: string[] = [];
    const get = async (url: string) => {
      urls.push(url);
      if (url === "https://registry.npmjs.org/example/1.2.3")
        return Response.json({
          name: "example",
          version: "1.2.3",
          gitHead: revision,
          repository: { url: "git+https://github.com/owner/project.git" },
        });
      if (url === `https://api.github.com/repos/owner/project/contents/?ref=${revision}`)
        return Response.json([{ type: "file", name: "LICENSE", sha: "b".repeat(40) }]);
      if (url === `https://api.github.com/repos/owner/project/git/blobs/${"b".repeat(40)}`)
        return Response.json({
          encoding: "base64",
          content: Buffer.from("Copyright Publisher\nFull original license").toString("base64"),
        });
      return new Response("not found", { status: 404 });
    };
    const dependency = {
      name: "example",
      version: "1.2.3",
      source: "npm",
      license: "MIT",
      text: "",
    };
    expect(await downloadLicense(dependency, root, get)).toContain(
      "Copyright Publisher\nFull original license",
    );
    expect(urls.every((url) => !/\/(main|master|latest)\//.test(url))).toBe(true);
    expect(
      await downloadLicense(
        { ...dependency, version: "2" },
        root,
        async () => new Response("not found", { status: 404 }),
      ),
    ).toBe("");
  });

  mock.module("../src/hooks/settings/license_asset", () => ({
    readLicenseAsset: async () => "Bundled TXT",
  }));
  const { createLicenseTextLoader, loadLicenseText } =
    await import("../src/hooks/settings/license_text_data");
  test("两份 TXT 延迟本地加载并分别缓存，不注册 Metro 异步 JS bundle", async () => {
    const first = loadLicenseText("direct");
    expect(loadLicenseText("direct")).toBe(first);
    expect(await first).toBe("Bundled TXT");
    expect(loadLicenseText("all")).not.toBe(first);
    const source = await readFile(
      new URL("../src/hooks/settings/license_text_data.ts", import.meta.url),
      "utf8",
    );
    expect(source).toContain("LICENSES.txt");
    expect(source).toContain("ALL_LICENSES.txt");
    expect(source).not.toMatch(/\bimport\s*\(/);
    expect(source).not.toContain(".json");
  });
  test("许可资源读取失败后允许重试", async () => {
    let attempts = 0;
    const load = createLicenseTextLoader(async () => {
      if (++attempts === 1) throw new Error("failed");
      return "retry";
    });
    await expect(load("all")).rejects.toThrow("failed");
    expect(await load("all")).toBe("retry");
  });

  test("长文本分段不丢原文，不拆开 emoji，空文本没有虚拟项", () => {
    const text = "A".repeat(8191) + "🐱" + "B".repeat(8194) + "\r\nCopyright";
    const blocks = licenseTextBlocks(text);
    expect(blocks.map((block) => block.text).join("")).toBe(text);
    expect(blocks[0].text).toHaveLength(8191);
    expect(new Set(blocks.map((block) => block.id)).size).toBe(blocks.length);
    expect(licenseTextBlocks("")).toEqual([]);
  });

  test("所有构建只使用唯一生成入口更新两份 TXT", () => {
    for (const mode of ["build:android", "build:ios", "build:web"]) {
      const commands: string[] = [];
      vm.runInNewContext(readFileSync("tools/build/build.cjs", "utf8"), {
        __dirname: path.resolve("tools/build"),
        console: { log() {}, error() {} },
        process: { argv: ["node", "build.cjs", mode, "--dev"], platform: "win32", exit() {} },
        require: (id: string) =>
          id === "node:child_process"
            ? {
                execSync: (cmd: string) => {
                  commands.push(cmd);
                  if (cmd.includes("licenses:")) throw new Error("stop before build");
                },
                spawn() {},
              }
            : id === "./app_config.cjs"
              ? {}
              : require(id),
      });
      expect(commands).toContain("bun run licenses:generate");
      expect(commands).not.toContain("bun run licenses:verify");
      expect(commands).not.toContain("bun run licenses:release");
    }
  });

  test("开源许可文本切换、复制及错误展示", () => {
    const result = spawnSync(process.execPath, ["test", import.meta.path], {
      encoding: "utf8",
      env: { ...process.env, LONANOTE_LICENSE_UI_TEST: "1" },
    });
    if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
    expect(result.status).toBe(0);
  });
  test("许可文本页面返回关于，切 tab 和重开清理子栈", () => {
    let stack = [{ id: "about", params: {} }];
    stack = settingsNavigation(stack, { type: "push", id: "licenses" });
    stack = settingsNavigation(stack, { type: "back" });
    expect(stack.at(-1)?.id).toBe("about");
    stack = settingsNavigation(stack, { type: "reset", id: "appearance" });
    expect(stack).toEqual([{ id: "appearance", params: {} }]);
    expect(settingsNavigation(stack, { type: "back" })).toBe(stack);
  });
}
