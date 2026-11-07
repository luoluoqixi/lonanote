import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";

test("隔离验证 UI 字体的全局存储与远端快照", () => {
  const result = spawnSync(
    process.execPath,
    ["test", "./tests/global_fonts_ui_preferences.fixture.ts"],
    { cwd: process.cwd(), encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
});
