import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("设置全屏作用于所属工作台", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./dialog_workbench_fullscreen.fixture.tsx", import.meta.url))],
    { encoding: "utf8", timeout: 15000 },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
