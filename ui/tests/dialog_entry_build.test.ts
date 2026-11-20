import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);

test("额外导出隔离在 _dialog 内，不覆盖主页面，拒绝资源越界", async () => {
  const { writeDialogFiles } = require("../tools/build/dialog_entry.cjs");
  const directory = await mkdtemp(path.join(tmpdir(), "dialog-export-"));
  try {
    await writeFile(path.join(directory, "index.html"), "主入口");
    await writeDialogFiles(
      directory,
      new Map([
        ["index.html", { contents: "独立弹窗" }],
        ["assets/test.js", { contents: "entry" }],
      ]),
    );
    expect(await readFile(path.join(directory, "index.html"), "utf8")).toBe("主入口");
    expect(await readFile(path.join(directory, "_dialog/index.html"), "utf8")).toBe("独立弹窗");
    await expect(
      writeDialogFiles(directory, new Map([["../index.html", { contents: "错误" }]])),
    ).rejects.toThrow();
    expect(await readFile(path.join(directory, "index.html"), "utf8")).toBe("主入口");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("独立 Dialog 开发路由保留主入口并返回独立 bundle", async () => {
  const { createDialogMiddleware } = require("../tools/build/dialog_entry.cjs");
  let next = false;
  let body = "";
  const middleware = createDialogMiddleware(
    async () => "<script src='/src/dialog_entry.bundle?platform=web'></script>",
  );
  const response = {
    setHeader() {},
    end(value: string) {
      body = value;
    },
  };
  await middleware({ url: "/" }, response, () => {
    next = true;
  });
  expect(next).toBe(true);
  await middleware({ url: "/_dialog/workspace_entry_rename.html" }, response, () => {
    throw new Error("独立页面被交给 Router");
  });
  expect(body).toContain("/src/dialog_entry.bundle");
});

test("开发页面生成失败返回 500，不返回主入口 HTML", async () => {
  const { createDialogMiddleware } = require("../tools/build/dialog_entry.cjs");
  let body = "";
  const response = {
    statusCode: 200,
    setHeader() {},
    end(value: string) {
      body = value;
    },
  };
  await createDialogMiddleware(async () => {
    throw new Error("打包失败");
  })({ url: "/_dialog/settings.html?requestId=test" }, response, () => {});
  expect(response.statusCode).toBe(500);
  expect(body).toContain("打包失败");
});
