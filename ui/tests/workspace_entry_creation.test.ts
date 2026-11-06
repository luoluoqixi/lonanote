import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行文件菜单命名创建流程回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./workspace_entry_creation.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
});
