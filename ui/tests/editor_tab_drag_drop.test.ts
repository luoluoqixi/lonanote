import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Web 标签拖放实际 DOM 交接回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./editor_tab_drag_drop.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
