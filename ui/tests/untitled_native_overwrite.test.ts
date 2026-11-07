import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("原生保存框确认覆盖后不重复询问，提交仍显式传递覆盖标志", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./untitled_native_overwrite.fixture.ts", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
