import { expect, test } from "bun:test";
import { fileURLToPath } from "node:url";

test("首快照失败不得宣称同步就绪或无限挂起工作区启动", async () => {
  // Bun 的 module mock 跨文件共享；启动桥接测试须独立进程，避免污染其他套件。
  const child = Bun.spawn(
    [
      process.execPath,
      fileURLToPath(new URL("./fixtures/config_sync_failure.ts", import.meta.url)),
    ],
    {
      cwd: fileURLToPath(new URL("..", import.meta.url)),
      stdout: "pipe",
      stderr: "pipe",
    },
  );
  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);
  expect(stderr).toBe("");
  expect(exitCode).toBe(0);
});
