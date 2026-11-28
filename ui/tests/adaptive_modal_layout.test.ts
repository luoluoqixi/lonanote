import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("真实 Dialog 与 AdaptiveModal 的关闭按钮和滚动布局回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./adaptive_modal_layout.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
