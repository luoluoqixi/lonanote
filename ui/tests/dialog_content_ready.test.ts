import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Dialog 内容提交时机回归在独立 DOM 中运行", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./dialog_content_ready.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  expect(result.status).toBe(0);
}, 30000);
