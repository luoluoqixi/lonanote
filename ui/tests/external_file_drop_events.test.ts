import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("外部文件拖放原生事件目标回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./external_file_drop_events.fixture.ts", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
});
