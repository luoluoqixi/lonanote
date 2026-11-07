import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("编辑器滚动不会逐帧刷新外围菜单，真实状态变化仍更新菜单", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./editor_shell_updates.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
