import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行辅助编辑器窗口挂载与关闭协议回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./auxiliary_editor_shell.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
