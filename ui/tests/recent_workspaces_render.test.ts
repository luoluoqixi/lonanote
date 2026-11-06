import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行历史列表 DOM 回归，避免组件 mock 污染其他测试", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./recent_workspaces_render.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
});
