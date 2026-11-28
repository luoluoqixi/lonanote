import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Web 标题栏和列表外观不会触发 pointerEvents 弃用警告", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./web_pointer_events.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
