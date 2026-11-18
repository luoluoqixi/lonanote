import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行目录选择器原生窗口重开回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./directory_picker_window.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stdout + "\n" + result.stderr);
  expect(result.status).toBe(0);
}, 30000);
