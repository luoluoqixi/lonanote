import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行上下文菜单默认与持久化偏好回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./desktop_context_menu_defaults.fixture.ts", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stdout + "\n" + result.stderr);
  expect(result.status).toBe(0);
});
