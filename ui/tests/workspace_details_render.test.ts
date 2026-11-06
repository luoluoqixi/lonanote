import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("隔离运行详情布局 RN Web 渲染回归", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./workspace_details_render.fixture.tsx", import.meta.url))],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
});
