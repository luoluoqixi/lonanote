import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("路径 Tooltip 保留真实 RNW 文件行与标签的完整按压生命周期", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./file_path_tooltip_touch.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
