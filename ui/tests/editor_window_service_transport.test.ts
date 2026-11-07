import { expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("真实辅助窗口服务的握手与销毁通信回归", () => {
  const result = spawnSync(
    process.execPath,
    [
      "test",
      fileURLToPath(new URL("./editor_window_service_transport.fixture.ts", import.meta.url)),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`${result.stdout}\n${result.stderr}`);
  expect(result.status).toBe(0);
}, 30000);
