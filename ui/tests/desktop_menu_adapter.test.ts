import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行全局桌面菜单 adapter 行为回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./desktop_menu_adapter.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
});
