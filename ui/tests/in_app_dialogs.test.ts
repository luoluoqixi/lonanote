import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("应用级弹窗在当前界面打开，取消后可以再次使用", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./in_app_dialogs.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stdout + "\n" + result.stderr);
  expect(result.status).toBe(0);
}, 30000);
