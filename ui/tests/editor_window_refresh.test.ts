import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("辅助窗口刷新使用 owner 当前成员恢复", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./editor_window_refresh.fixture.ts", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
