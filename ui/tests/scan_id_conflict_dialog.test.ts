import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("重复工作区 ID 确认交互", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./scan_id_conflict_dialog.fixture.ts", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
