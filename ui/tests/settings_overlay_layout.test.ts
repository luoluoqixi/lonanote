import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("真实 Web Dialog 与 Sheet 验证设置布局和退出生命周期", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./settings_overlay_layout.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
