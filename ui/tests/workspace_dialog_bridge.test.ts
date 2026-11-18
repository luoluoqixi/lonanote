import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("工作区 Dialog 视图与业务动作跨窗口往返", () => {
  const result = spawnSync(
    process.execPath,
    ["test", fileURLToPath(new URL("./workspace_dialog_bridge.fixture.tsx", import.meta.url))],
    { encoding: "utf8", timeout: 15000 },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
