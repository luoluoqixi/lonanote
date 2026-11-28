import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("原生 Dropdown 定位契约", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./native_menu_placement.fixture.ts", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
